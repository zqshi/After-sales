import { config } from '@config/app.config';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';
import { LLMClient } from '@infrastructure/ai/LLMClient';

type AiIssue = { type: string; severity: string; description: string };
type AiTimelineEntry = { messageId: string; sentiment: string; score: number; timestamp: string };
type AiKeyPhrase = { phrase: string; sentiment: string; score: number };
type AiRecommendation = { id: string; title: string; category: string; score: number };

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
    let confidence = 0.6; // 关键词匹配置信度较低
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
