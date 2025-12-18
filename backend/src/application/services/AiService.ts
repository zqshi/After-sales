import { config } from '@config/app.config';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';

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
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly knowledgeRecommender: KnowledgeRecommender,
  ) {}

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
