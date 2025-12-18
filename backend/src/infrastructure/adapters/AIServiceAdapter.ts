import { config } from '@config/app.config';

/**
 * 金山云 DeepSeek AI 服务适配器
 * 支持对话分析和方案推荐
 */

export interface AIAnalyzeRequest {
  conversationId: string;
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: string;
  keywords?: string[];
}

export interface AIAnalyzeResponse {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  suggestions: string[];
  recommendations: Array<{
    id: string;
    title: string;
    category: string;
    score: number;
  }>;
}

export interface AIRecommendRequest {
  query: string;
  context?: string;
  topK?: number;
}

export interface AIRecommendResponse {
  recommendations: Array<{
    title: string;
    content: string;
    relevance: number;
  }>;
}

export class AIServiceAdapter {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.baseUrl = config.ai.serviceUrl;
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
    this.timeout = config.ai.timeout;
    this.maxRetries = config.ai.maxRetries;
  }

  /**
   * 检查AI服务是否可用
   */
  isEnabled(): boolean {
    return config.ai.enabled;
  }

  /**
   * 分析对话质量和情感
   */
  async analyzeConversation(request: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
    if (!this.isEnabled()) {
      throw new Error('AI service is not enabled');
    }

    // 构建 DeepSeek 分析 prompt
    const prompt = this.buildAnalyzePrompt(request);

    const response = await this.callDeepSeek({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的客服对话分析助手，擅长分析对话质量、识别问题并提供改进建议。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return this.parseAnalyzeResponse(response);
  }

  /**
   * 推荐知识库内容
   */
  async recommendKnowledge(request: AIRecommendRequest): Promise<AIRecommendResponse> {
    if (!this.isEnabled()) {
      throw new Error('AI service is not enabled');
    }

    const prompt = this.buildRecommendPrompt(request);

    const response = await this.callDeepSeek({
      messages: [
        {
          role: 'system',
          content: '你是一个智能知识推荐助手，根据用户问题推荐相关的知识库内容。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return this.parseRecommendResponse(response);
  }

  /**
   * 调用金山云 DeepSeek API
   */
  private async callDeepSeek(requestBody: any, retryCount = 0): Promise<string> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          ...requestBody,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIServiceError(
          `AI service request failed with status ${response.status}: ${errorText}`,
          response.status
        );
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new AIServiceError('No response from AI service', 500);
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        if (retryCount < this.maxRetries) {
          console.log(`[AI] Request timeout, retrying... (${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(1000 * (retryCount + 1)); // 指数退避
          return this.callDeepSeek(requestBody, retryCount + 1);
        }
        throw new AIServiceError('AI service request timeout', 408);
      }

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(`AI service error: ${error.message}`, 500);
    }
  }

  /**
   * 构建对话分析 prompt
   */
  private buildAnalyzePrompt(request: AIAnalyzeRequest): string {
    const { conversationId, messages, context, keywords } = request;

    let prompt = `请分析以下客服对话的质量：\n\n`;

    if (context) {
      prompt += `对话背景：${context}\n\n`;
    }

    if (keywords && keywords.length > 0) {
      prompt += `关键词：${keywords.join('、')}\n\n`;
    }

    if (messages && messages.length > 0) {
      prompt += `对话内容：\n`;
      messages.forEach((msg, index) => {
        prompt += `${index + 1}. [${msg.role}]: ${msg.content}\n`;
      });
    } else {
      prompt += `对话ID：${conversationId}\n`;
    }

    prompt += `\n请以JSON格式返回分析结果，包含以下字段：
{
  "summary": "对话摘要",
  "sentiment": "positive/neutral/negative",
  "score": 0-1之间的分数,
  "confidence": 0-1之间的置信度,
  "issues": [{"type": "问题类型", "severity": "low/medium/high", "description": "问题描述"}],
  "suggestions": ["改进建议1", "改进建议2"],
  "keyPhrases": ["关键词1", "关键词2"]
}`;

    return prompt;
  }

  /**
   * 构建知识推荐 prompt
   */
  private buildRecommendPrompt(request: AIRecommendRequest): string {
    const { query, context, topK = 3 } = request;

    let prompt = `用户问题：${query}\n\n`;

    if (context) {
      prompt += `上下文：${context}\n\n`;
    }

    prompt += `请推荐${topK}个最相关的知识库内容，以JSON格式返回：
{
  "recommendations": [
    {
      "title": "知识标题",
      "content": "知识摘要",
      "relevance": 0-1之间的相关度分数
    }
  ]
}`;

    return prompt;
  }

  /**
   * 解析分析响应
   */
  private parseAnalyzeResponse(responseText: string): AIAnalyzeResponse {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '无摘要',
        sentiment: parsed.sentiment || 'neutral',
        score: parsed.score || 0.7,
        confidence: parsed.confidence || 0.8,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.warn('[AI] Failed to parse analyze response:', error);
      // 返回默认响应
      return {
        summary: responseText.substring(0, 200),
        sentiment: 'neutral',
        score: 0.7,
        confidence: 0.5,
        issues: [],
        suggestions: [],
        recommendations: [],
      };
    }
  }

  /**
   * 解析推荐响应
   */
  private parseRecommendResponse(responseText: string): AIRecommendResponse {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.warn('[AI] Failed to parse recommend response:', error);
      return {
        recommendations: [],
      };
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * AI 服务错误类
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
