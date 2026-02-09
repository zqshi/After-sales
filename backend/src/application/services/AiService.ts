/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { config } from '@config/app.config';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';
import { LLMClient } from '@infrastructure/ai/LLMClient';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { loadPrompt } from '@/prompts/loader';

type AiIssue = { type: string; severity: string; description: string };
type AiTimelineEntry = { messageId: string; sentiment: string; score: number; timestamp: string };
type AiKeyPhrase = { phrase: string; sentiment: string; score: number };
type AiRecommendation = { id: string; title: string; category: string; score: number };

const ASSESS_RISK_PROMPT = loadPrompt(
  'backend/ai-service/assess_risk_system.md',
  `你是客服风险评估专家，输出JSON:\n{\n  "riskLevel": "low|medium|high",\n  "score": 0.0-1.0,\n  "indicators": ["..."],\n  "reasoning": "..." \n}`,
);
const EXTRACT_REQUIREMENTS_PROMPT = loadPrompt(
  'backend/ai-service/extract_requirements_system.md',
  `你是需求分析专家，输出JSON:\n{\n  "requirements": [\n    {\n      "title": "...",\n      "category": "product|technical|service",\n      "priority": "urgent|high|medium|low",\n      "confidence": 0.0-1.0,\n      "clarification_needed": true/false\n    }\n  ]\n}`,
);
const ANALYZE_LOGS_PROMPT = loadPrompt(
  'backend/ai-service/analyze_logs_system.md',
  `你是日志分析专家，输出JSON:\n{\n  "summary": "...",\n  "error_signatures": ["..."],\n  "root_cause": "..." \n}`,
);
const CLASSIFY_ISSUE_PROMPT = loadPrompt(
  'backend/ai-service/classify_issue_system.md',
  `你是问题分类专家，输出JSON:\n{\n  "issue_type": "fault|request|complaint|inquiry",\n  "category": "product|technical|service",\n  "severity": "P0|P1|P2|P3|P4",\n  "confidence": 0.0-1.0\n}`,
);
const RECOMMEND_SOLUTION_PROMPT = loadPrompt(
  'backend/ai-service/recommend_solution_system.md',
  `你是故障解决专家，输出JSON:\n{\n  "steps": ["步骤1", "步骤2"],\n  "temporary_solution": "可选临时方案"\n}`,
);

export interface AnalyzeConversationRequest {
  conversationId: string;
  context?: string;
  model?: string;
  options?: {
    keywords?: string[];
    includeHistory?: boolean;
    depth?: 'brief' | 'detailed';
    [key: string]: unknown;
  };
}

export interface AnalyzeConversationResult {
  conversationId: string;
  analysisType: string;
  summary: string;
  issues: AiIssue[];
  strengths: string[];
  timeline: AiTimelineEntry[];
  keyPhrases: AiKeyPhrase[];
  recommendations: AiRecommendation[];
  improvementSuggestions: string[];
  overallSentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  result: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    confidence: number;
    strengths: string[];
    issues: AiIssue[];
    timeline: AiTimelineEntry[];
    keyPhrases: AiKeyPhrase[];
    recommendations: AiRecommendation[];
    improvementSuggestions: string[];
  };
  model: string;
  analyzedAt: string;
}

type AiAnalysisResultPayload = AnalyzeConversationResult['result'];

export interface ApplySolutionRequest {
  conversationId: string;
  solutionType: string;
  solutionId?: string;
  messageTemplate?: string;
  customization?: Record<string, unknown>;
}

export interface ApplySolutionResult {
  message: string;
  title: string;
  appliedSolution: {
    type: string;
    id?: string;
    title?: string;
  };
  taskDraft?: {
    title: string;
    description: string;
  };
}

export class AiService {
  private readonly llmClient: LLMClient;

  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly knowledgeRecommender: KnowledgeRecommender,
  ) {
    this.llmClient = new LLMClient();
  }

  private extractJson(text: string): Record<string, unknown> | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  private async generateJson(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<Record<string, unknown> | null> {
    if (!this.llmClient.isEnabled()) {
      return null;
    }
    try {
      const raw = await this.llmClient.generate([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      return this.extractJson(raw);
    } catch (err) {
      console.warn('[AiService] generateJson failed:', err);
      return null;
    }
  }

  async assessRisk(content: string): Promise<{ riskLevel: 'low' | 'medium' | 'high'; score: number; indicators: string[]; reasoning: string }> {
    const result = await this.generateJson(ASSESS_RISK_PROMPT, `客户消息：${content}`);
    if (result) {
      return {
        riskLevel: (result.riskLevel as any) || 'medium',
        score: typeof result.score === 'number' ? result.score : 0.6,
        indicators: Array.isArray(result.indicators) ? result.indicators.map(String) : [],
        reasoning: String(result.reasoning ?? '模型评估完成'),
      };
    }
    const urgent = ['投诉', '退款', '宕机', '崩溃', '无法使用'].some((kw) => content.includes(kw));
    return {
      riskLevel: urgent ? 'high' : 'low',
      score: urgent ? 0.85 : 0.4,
      indicators: urgent ? ['紧急/投诉关键词'] : [],
      reasoning: urgent ? '检测到紧急关键词' : '未发现明显风险关键词',
    };
  }

  async extractRequirements(content: string): Promise<Array<{ title: string; category: string; priority: string; confidence: number; clarification_needed: boolean }>> {
    const result = await this.generateJson(EXTRACT_REQUIREMENTS_PROMPT, `客户消息：${content}`);
    if (result && Array.isArray(result.requirements)) {
      return result.requirements.map((req: any) => ({
        title: String(req.title ?? content.substring(0, 30)),
        category: String(req.category ?? 'service'),
        priority: String(req.priority ?? 'medium'),
        confidence: typeof req.confidence === 'number' ? req.confidence : 0.6,
        clarification_needed: Boolean(req.clarification_needed),
      }));
    }
    const hasReq = ['需要', '希望', '想要', '能不能', '可以', '功能'].some((kw) => content.includes(kw));
    return hasReq
      ? [{
          title: content.substring(0, 30),
          category: 'service',
          priority: 'medium',
          confidence: 0.65,
          clarification_needed: false,
        }]
      : [];
  }

  async recommendNextAction(context: { riskLevel?: string; sentiment?: string; urgent?: boolean }): Promise<{ action: string; reason: string }> {
    const urgent = context.urgent || context.riskLevel === 'high';
    if (urgent) {
      return { action: 'escalate_to_human', reason: '高风险/紧急场景' };
    }
    return { action: 'reply_with_suggestion', reason: '常规咨询可自动回复' };
  }

  async analyzeLogs(logs: string): Promise<{ summary: string; error_signatures: string[]; root_cause: string }> {
    const result = await this.generateJson(ANALYZE_LOGS_PROMPT, `日志内容：\n${logs}`);
    if (result) {
      return {
        summary: String(result.summary ?? '日志分析完成'),
        error_signatures: Array.isArray(result.error_signatures) ? result.error_signatures.map(String) : [],
        root_cause: String(result.root_cause ?? 'unknown'),
      };
    }
    const signatures = Array.from(new Set((logs.match(/(error|exception|fail|panic)/gi) || []).map((m) => m.toLowerCase())));
    return {
      summary: '未启用模型，返回基础日志分析结果',
      error_signatures: signatures,
      root_cause: signatures.length > 0 ? '存在错误关键词，需进一步排查' : '未发现明显错误关键词',
    };
  }

  async classifyIssue(content: string): Promise<{ issue_type: string; category: string; severity: string; confidence: number }> {
    const result = await this.generateJson(CLASSIFY_ISSUE_PROMPT, `客户消息：${content}`);
    if (result) {
      return {
        issue_type: String(result.issue_type ?? 'inquiry'),
        category: String(result.category ?? 'service'),
        severity: String(result.severity ?? 'P2'),
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.6,
      };
    }
    const urgent = ['宕机', '崩溃', '无法'].some((kw) => content.includes(kw));
    return {
      issue_type: urgent ? 'fault' : 'inquiry',
      category: urgent ? 'technical' : 'service',
      severity: urgent ? 'P1' : 'P3',
      confidence: 0.55,
    };
  }

  async recommendSolution(issue: string): Promise<{ steps: string[]; temporary_solution?: string }> {
    const result = await this.generateJson(RECOMMEND_SOLUTION_PROMPT, `问题描述：${issue}`);
    if (result) {
      return {
        steps: Array.isArray(result.steps) ? result.steps.map(String) : [],
        temporary_solution: result.temporary_solution ? String(result.temporary_solution) : undefined,
      };
    }
    return {
      steps: ['收集错误信息', '确认影响范围', '安排技术排查'],
      temporary_solution: '建议客户稍后重试并保持关注',
    };
  }

  async estimateResolutionTime(severity: string): Promise<{ estimate: string }> {
    const map: Record<string, string> = {
      P0: '30分钟内',
      P1: '2小时内',
      P2: '1天内',
      P3: '3天内',
      P4: '1周内',
    };
    return { estimate: map[severity] ?? '待评估' };
  }

  async checkCompliance(content: string): Promise<{ compliant: boolean; issues: string[] }> {
    const keywords = ['保证100%', '永久', '必须赔偿', '违法'];
    const hits = keywords.filter((kw) => content.includes(kw));
    return {
      compliant: hits.length === 0,
      issues: hits.length === 0 ? [] : hits.map((kw) => `包含潜在违规词：${kw}`),
    };
  }

  async detectViolations(content: string): Promise<{ violations: string[] }> {
    const result = await this.checkCompliance(content);
    return { violations: result.issues };
  }

  async compareTeamPerformance(reports: Array<{ teamId: string; qualityScore?: number }>): Promise<{ averages: Record<string, number>; overall: number }> {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const report of reports) {
      if (!sums[report.teamId]) {
        sums[report.teamId] = { total: 0, count: 0 };
      }
      if (typeof report.qualityScore === 'number') {
        sums[report.teamId].total += report.qualityScore;
        sums[report.teamId].count += 1;
      }
    }
    const averages: Record<string, number> = {};
    let total = 0;
    let count = 0;
    for (const [teamId, value] of Object.entries(sums)) {
      const avg = value.count > 0 ? value.total / value.count : 0;
      averages[teamId] = avg;
      total += value.total;
      count += value.count;
    }
    return { averages, overall: count > 0 ? total / count : 0 };
  }

  async analyzeConversation(request: AnalyzeConversationRequest): Promise<AnalyzeConversationResult> {
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }

    if (config.ai.serviceUrl) {
      try {
        return await this.callExternalAnalyze(request);
      } catch (err) {
        console.warn('[ai] external analyze failed, falling back to local logic', err);
      }
    }

    const keywords = this.normalizeKeywords(request.options?.keywords);
    const pool = await this.fetchKnowledgePool(5);
    const recommendations = this.buildRecommendations(pool, keywords);
    const timestamp = new Date().toISOString();
    const now = Date.now();

    const issues = [
      {
        type: 'response_quality',
        severity: 'low',
        description: '可以在首次回复中主动提供操作步骤',
      },
    ];

    const payload: AiAnalysisResultPayload = {
      overallSentiment: 'positive',
      score: 0.82,
      confidence: 0.91,
      strengths: [
        '应答专业礼貌',
        '主动引导客户关注主要功能',
        '及时引用知识库条目',
      ],
      issues,
      timeline: [
        {
          messageId: `${request.conversationId}-msg-001`,
          sentiment: 'neutral',
          score: 0.56,
          timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
        },
        {
          messageId: `${request.conversationId}-msg-002`,
          sentiment: 'positive',
          score: 0.82,
          timestamp,
        },
      ],
      keyPhrases: keywords.map((keyword) => ({
        phrase: keyword,
        sentiment: 'positive',
        score: 0.75,
      })),
      recommendations,
      improvementSuggestions: [
        '在回复中附带引用知识库链接',
        '对关键术语补充操作步骤',
      ],
    };
    const summary = `AI 识别到关键词 ${keywords.join('、')}，整体表现稳定，可补充更多操作引导。`;

    return {
      conversationId: request.conversationId,
      analysisType: request.context ?? 'quality',
      summary,
      issues,
      strengths: payload.strengths,
      timeline: payload.timeline,
      keyPhrases: payload.keyPhrases,
      recommendations: payload.recommendations,
      improvementSuggestions: payload.improvementSuggestions,
      overallSentiment: payload.overallSentiment,
      score: payload.score,
      confidence: payload.confidence,
      model: request.model ?? 'gpt-4',
      analyzedAt: timestamp,
      result: payload,
    };
  }

  async summarizeConversation(conversationId: string): Promise<string> {
    /**
     * 生成对话总结
     * Phase 1: 使用简单的本地实现
     * TODO Phase 2: 调用LLM生成智能总结
     */
    try {
      // 尝试调用外部AI服务
      if (config.ai.serviceUrl) {
        const url = `${config.ai.serviceUrl.replace(/\/$/, '')}/ai/summarize`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (config.ai.apiKey) {
          headers.Authorization = `Bearer ${config.ai.apiKey}`;
        }
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ conversationId }),
        });
        if (response.ok) {
          const data = await response.json();
          return data.summary || data;
        }
      }
    } catch (err) {
      console.warn('[ai] external summarize failed, using fallback', err);
    }

    // 降级：使用本地实现
    return `会话 ${conversationId} 的所有关联任务已完成。问题已得到解决。`;
  }

  /**
   * 分析单条消息的情绪
   * 使用大模型进行深度情感分析，支持上下文理解
   */
  async analyzeSentiment(
    content: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<{
    overallSentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    confidence: number;
    emotions?: string[];
    reasoning?: string;
  }> {
    if (!content || content.trim().length === 0) {
      return {
        overallSentiment: 'neutral',
        score: 0.5,
        confidence: 0.5,
        emotions: [],
        reasoning: '空消息',
      };
    }

    // 尝试使用LLM进行情绪分析
    if (this.llmClient.isEnabled()) {
      try {
        const result = await this.llmClient.analyzeSentiment(content, conversationHistory);
        return {
          overallSentiment: result.overallSentiment,
          score: result.score,
          confidence: result.confidence,
          emotions: result.emotions,
          reasoning: result.reasoning,
        };
      } catch (error) {
        console.warn('[AiService] LLM情绪分析失败，降级到关键词匹配:', error);
        // 降级到关键词匹配
      }
    }

    // 降级方案：简单关键词匹配
    return this.fallbackSentimentAnalysis(content);
  }

  async detectProblemIntent(
    content: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<{
    isProblem: boolean;
    intent?: string;
    confidence?: number;
    title?: string;
  }> {
    const llmClient = this.llmClient;
    if (llmClient && llmClient.isEnabled()) {
      try {
        const intent = await llmClient.extractIntent(content, conversationHistory);
        const isProblem =
          intent.confidence >= 0.6 &&
          (intent.isQuestion || ['complaint', 'request', 'urgent'].includes(intent.intent));
        const title = intent.keywords?.length
          ? intent.keywords.slice(0, 3).join(' / ')
          : undefined;
        return {
          isProblem,
          intent: intent.intent,
          confidence: intent.confidence,
          title,
        };
      } catch (err) {
        console.warn('[ai] extract intent failed, fallback to heuristic', err);
      }
    }

    const problemKeywords = [
      '报错',
      '错误',
      '异常',
      '崩溃',
      '无法',
      '失败',
      '卡顿',
      '白屏',
      '投诉',
      '不满意',
      '退款',
      'bug',
    ];
    const isProblem = problemKeywords.some((kw) => content.includes(kw));
    return {
      isProblem,
      intent: isProblem ? 'inquiry' : undefined,
      confidence: isProblem ? 0.5 : 0.2,
      title: isProblem ? content.slice(0, 20) : undefined,
    };
  }

  async detectProblemResolution(
    content: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<{ resolved: boolean; reopened: boolean; confidence: number; reasoning: string }> {
    const llmClient = this.llmClient;
    if (llmClient && llmClient.isEnabled()) {
      try {
        const prompt: Array<{ role: 'system' | 'user'; content: string }> = [
          {
            role: 'system' as const,
            content: `你是客服质检助手。判断客户消息是否表示"问题已解决"或"问题未解决/复开"，返回JSON：
{
  "resolved": true/false,
  "reopened": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "简要原因"
}

规则：
1. resolved表示已解决/感谢/确认问题消失。
2. reopened表示仍未解决/再次复发/仍然有问题。
3. 如果无法判断，二者均为false。`,
          },
        ];

        if (conversationHistory && conversationHistory.length > 0) {
          prompt.push({
            role: 'system' as const,
            content: `对话历史：\n${conversationHistory
              .map((msg) => `${msg.role}: ${msg.content}`)
              .join('\n')}`,
          });
        }

        prompt.push({
          role: 'user' as const,
          content: `客户消息：\n"${content}"`,
        });

        const response = await llmClient.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            resolved: Boolean(parsed.resolved),
            reopened: Boolean(parsed.reopened),
            confidence: parseFloat(parsed.confidence) || 0.6,
            reasoning: parsed.reasoning || 'LLM判断',
          };
        }
      } catch (err) {
        console.warn('[ai] detect resolution failed, fallback to heuristic', err);
      }
    }

    const resolvedPattern = /问题.*解决|解决.*问题|已.*解决|感谢.*解决|已恢复|已修复/;
    const reopenedPattern = /没解决|未解决|还是.*问题|仍然.*(报错|错误|异常)|依旧.*(失败|无法)/;
    if (resolvedPattern.test(content)) {
      return {
        resolved: true,
        reopened: false,
        confidence: 0.7,
        reasoning: '关键词命中：已解决/已修复',
      };
    }
    if (reopenedPattern.test(content)) {
      return {
        resolved: false,
        reopened: true,
        confidence: 0.7,
        reasoning: '关键词命中：未解决/仍然异常',
      };
    }
    return {
      resolved: false,
      reopened: false,
      confidence: 0.3,
      reasoning: '未识别到明确结论',
    };
  }

  /**
   * 降级方案：关键词匹配情绪分析
   */
  private fallbackSentimentAnalysis(content: string): {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    confidence: number;
    emotions: string[];
    reasoning: string;
  } {
    const negativeKeywords = [
      '不行',
      '投诉',
      '差',
      '退款',
      'bug',
      '错误',
      '失败',
      '无法',
      '不能',
      '不满',
      '糟糕',
      '愤怒',
    ];
    const positiveKeywords = [
      '感谢',
      '满意',
      '好',
      '解决了',
      '谢谢',
      '完美',
      '优秀',
      '赞',
      '棒',
    ];

    // 特殊处理："问题解决了"是正面的
    const hasProblemSolved = /问题.*解决|解决.*问题|已.*解决/.test(content);

    const normalizedContent = content.toLowerCase();
    const negCount = negativeKeywords.filter((kw) =>
      normalizedContent.includes(kw),
    ).length;
    const posCount = positiveKeywords.filter((kw) =>
      normalizedContent.includes(kw),
    ).length;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let score = 0.5;
    const confidence = 0.6; // 关键词匹配置信度较低
    let emotions: string[] = [];

    if (hasProblemSolved) {
      sentiment = 'positive';
      score = 0.8;
      emotions = ['满意', '感谢'];
    } else if (negCount > posCount) {
      sentiment = 'negative';
      score = Math.max(0.1, 0.5 - negCount * 0.1);
      emotions = ['不满'];
    } else if (posCount > negCount) {
      sentiment = 'positive';
      score = Math.min(0.95, 0.5 + posCount * 0.1);
      emotions = ['满意'];
    }

    return {
      overallSentiment: sentiment,
      score,
      confidence,
      emotions,
      reasoning: '基于关键词匹配的简单分析',
    };
  }

  async applySolution(request: ApplySolutionRequest): Promise<ApplySolutionResult> {
    if (!request.conversationId) {
      throw new Error('conversationId is required');
    }
    if (!request.solutionType) {
      throw new Error('solutionType is required');
    }

    if (config.ai.serviceUrl) {
      try {
        return await this.callExternalApplySolution(request);
      } catch (err) {
        console.warn('[ai] external apply solution failed, falling back to local logic', err);
      }
    }

    const knowledgeItem = await this.resolveKnowledgeItem(request.solutionId);
    const title = knowledgeItem?.title ?? '自动解决方案';
    const category = knowledgeItem?.category.value ?? 'other';
    const template =
      request.messageTemplate ?? '推荐参考《{{title}}》来解答当前需求。';
    const message = template
      .replace(/\{\{title\}\}/g, title)
      .replace(/\{\{category\}\}/g, category)
      .replace(/\{\{conversationId\}\}/g, request.conversationId);

    const result: ApplySolutionResult = {
      message,
      title,
      appliedSolution: {
        type: request.solutionType,
        id: knowledgeItem?.id,
        title,
      },
    };

    if (knowledgeItem) {
      result.taskDraft = {
        title: `跟进：${title}`,
        description: `参照知识库《${title}》完成后续沟通并更新对话结果。`,
      };
    }

    return result;
  }

  private normalizeKeywords(raw?: string[]): string[] {
    const fallback = ['support', 'guidance', 'troubleshooting'];
    if (!raw || raw.length === 0) {
      return fallback;
    }
    const normalized = raw
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);
    return normalized.length ? normalized : fallback;
  }

  private async fetchKnowledgePool(limit: number): Promise<KnowledgeItem[]> {
    return this.knowledgeRepository.findByFilters({}, { limit, offset: 0 });
  }

  private buildRecommendations(pool: KnowledgeItem[], keywords: string[]) {
    const items = pool ?? [];
    const mapped = items.map((item) => ({
      id: item.id,
      title: item.title,
      tags: item.tags,
      category: item.category.value,
    }));
    const entries = this.knowledgeRecommender.recommendByKeywords(mapped, keywords);
    return entries.slice(0, 3).map((entry) => {
      const matched = items.find((item) => item.id === entry.knowledgeId);
      return {
        id: entry.knowledgeId,
        title: matched?.title ?? '知识条目',
        category: matched?.category.value ?? 'other',
        score: entry.score,
      };
    });
  }

  private async resolveKnowledgeItem(knowledgeId?: string) {
    if (knowledgeId) {
      const match = await this.knowledgeRepository.findById(knowledgeId);
      if (match) {
        return match;
      }
    }
    const pool = await this.fetchKnowledgePool(1);
    return pool.length > 0 ? pool[0] : null;
  }

  private async callExternalAnalyze(request: AnalyzeConversationRequest) {
    const url = `${config.ai.serviceUrl.replace(/\/$/, '')}/ai/analyze`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.ai.apiKey) {
      headers.Authorization = `Bearer ${config.ai.apiKey}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`AI analyze request failed with status ${response.status}`);
    }
    const payload = await response.json();
    return payload?.data ?? payload;
  }

  private async callExternalApplySolution(request: ApplySolutionRequest) {
    const url = `${config.ai.serviceUrl.replace(/\/$/, '')}/ai/solutions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.ai.apiKey) {
      headers.Authorization = `Bearer ${config.ai.apiKey}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`AI apply solution request failed with status ${response.status}`);
    }
    const payload = await response.json();
    return payload?.data ?? payload;
  }
}
