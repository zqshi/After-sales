/**
 * LLMClient - 大模型客户端
 *
 * 统一封装各大模型API调用（OpenAI/Claude/通义千问/DeepSeek等）
 * 提供情绪识别、意图提取、回复生成等能力
 */

import { config } from '@config/app.config';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SentimentAnalysisResult {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1，越接近1越积极
  confidence: number; // 0-1
  emotions: string[]; // 情绪标签：['焦虑', '不满', '愤怒']
  reasoning: string; // 分析理由
}

export interface IntentExtractionResult {
  isQuestion: boolean;
  intent: 'inquiry' | 'complaint' | 'request' | 'feedback' | 'chitchat' | 'urgent';
  keywords: string[];
  entities: Record<string, string>; // {订单号: 'ORD123', 产品名: '退款功能'}
  confidence: number;
}

export interface ReplyGenerationResult {
  suggestedReply: string;
  confidence: number;
  reasoning: string;
}

export class LLMClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly provider: string;

  constructor() {
    this.baseUrl = config.ai.serviceUrl;
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
    this.provider = config.ai.provider;
  }

  /**
   * 检查LLM服务是否可用
   */
  isEnabled(): boolean {
    return config.ai.enabled && !!this.baseUrl && !!this.apiKey;
  }

  /**
   * 情绪识别分析（使用大模型）
   */
  async analyzeSentiment(
    content: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<SentimentAnalysisResult> {
    if (!this.isEnabled()) {
      throw new Error('LLM服务未启用或配置不完整');
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的客服对话情绪分析专家。分析客户消息的情绪，返回JSON格式：
{
  "overallSentiment": "positive|neutral|negative",
  "score": 0.0-1.0,
  "confidence": 0.0-1.0,
  "emotions": ["具体情绪标签"],
  "reasoning": "分析理由"
}

情绪分类规则：
- positive（正面）：感谢、满意、表扬、解决了问题
- neutral（中性）：普通咨询、陈述事实、无明显情绪
- negative（负面）：投诉、不满、愤怒、焦虑、失望

注意：
1. 要理解上下文，"我的问题解决了，谢谢"是positive而非negative
2. 识别反讽和双重否定："不是不好"是正面倾向
3. 情绪标签示例：满意、感谢、焦虑、不满、愤怒、失望、困惑、急迫`,
      },
    ];

    // 添加对话历史（如果有）
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push({
        role: 'user',
        content: `对话历史：\n${conversationHistory
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n')}\n\n请结合对话历史分析情绪趋势。`,
      });
    }

    messages.push({
      role: 'user',
      content: `请分析以下客户消息的情绪：\n\n"${content}"\n\n返回JSON格式分析结果。`,
    });

    const response = await this.callLLM(messages);
    return this.parseSentimentResponse(response);
  }

  /**
   * 意图提取和问题识别
   */
  async extractIntent(
    content: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<IntentExtractionResult> {
    if (!this.isEnabled()) {
      throw new Error('LLM服务未启用或配置不完整');
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的客服对话意图识别专家。分析客户消息的意图，返回JSON格式：
{
  "isQuestion": true/false,
  "intent": "inquiry|complaint|request|feedback|chitchat|urgent",
  "keywords": ["关键词1", "关键词2"],
  "entities": {"实体类型": "实体值"},
  "confidence": 0.0-1.0
}

意图分类：
- inquiry（咨询）：询问信息、使用方法、流程说明
- complaint（投诉）：表达不满、质疑、要求赔偿
- request（需求）：请求功能、申请服务、要求处理
- feedback（反馈）：建议、意见、体验分享
- chitchat（闲聊）：寒暄、感谢、无实质需求
- urgent（紧急）：系统故障、业务受阻、需立即处理

实体提取示例：
- 订单号：ORD123456
- 产品名称：退款功能、登录模块
- 时间：昨天、上个月
- 金额：100元、退款`,
      },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push({
        role: 'user',
        content: `对话历史：\n${conversationHistory
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n')}`,
      });
    }

    messages.push({
      role: 'user',
      content: `请分析以下客户消息的意图：\n\n"${content}"\n\n返回JSON格式分析结果。`,
    });

    const response = await this.callLLM(messages);
    return this.parseIntentResponse(response);
  }

  /**
   * 生成智能回复建议
   */
  async generateReply(
    userMessage: string,
    sentiment: SentimentAnalysisResult,
    knowledgeItems: Array<{ title: string; content?: string; url: string }>,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<ReplyGenerationResult> {
    if (!this.isEnabled()) {
      throw new Error('LLM服务未启用或配置不完整');
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的客服回复助手。根据客户消息、情绪分析和知识库，生成合适的回复建议。

回复原则：
1. 根据情绪调整语气：
   - negative（负面）：先安抚情绪，表达理解和歉意，再提供解决方案
   - neutral（中性）：专业、简洁、直接提供信息
   - positive（正面）：表达感谢，保持积极态度

2. 引用知识库：
   - 如果知识库有相关内容，在回复中自然引用
   - 格式：您可以参考 [文档标题](URL) 了解详情

3. 回复结构：
   - 第一句：安抚/确认/感谢（根据情绪）
   - 第二句：解决方案/信息提供
   - 第三句：后续引导/知识库链接

返回JSON格式：
{
  "suggestedReply": "建议回复内容",
  "confidence": 0.0-1.0,
  "reasoning": "生成理由"
}`,
      },
    ];

    // 添加对话历史
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push({
        role: 'user',
        content: `对话历史：\n${conversationHistory
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n')}`,
      });
    }

    // 添加情绪分析结果
    messages.push({
      role: 'user',
      content: `客户消息："${userMessage}"

情绪分析结果：
- 情绪：${sentiment.overallSentiment} (${sentiment.score})
- 情绪标签：${sentiment.emotions.join('、')}
- 分析：${sentiment.reasoning}`,
    });

    // 添加知识库推荐
    if (knowledgeItems.length > 0) {
      const kbText = knowledgeItems
        .map(
          (item, i) =>
            `${i + 1}. [${item.title}](${item.url})${item.content ? `\n   内容摘要：${item.content.substring(0, 100)}...` : ''}`,
        )
        .join('\n');
      messages.push({
        role: 'user',
        content: `知识库推荐（请在回复中适当引用）：\n${kbText}`,
      });
    }

    messages.push({
      role: 'user',
      content: '请生成一个合适的客服回复建议（200字以内），返回JSON格式。',
    });

    const response = await this.callLLM(messages);
    return this.parseReplyResponse(response);
  }

  /**
   * 调用LLM API（统一接口，支持多种provider）
   */
  private async callLLM(messages: LLMMessage[]): Promise<string> {
    const timeout = config.ai.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let response: Response;

      if (this.provider === 'openai' || this.provider === 'deepseek') {
        // OpenAI兼容格式
        response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
          signal: controller.signal,
        });
      } else if (this.provider === 'anthropic') {
        // Claude格式
        response = await fetch(`${this.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model,
            messages: messages.filter((m) => m.role !== 'system'),
            system: messages.find((m) => m.role === 'system')?.content,
            max_tokens: 2000,
          }),
          signal: controller.signal,
        });
      } else {
        // 其他provider（通义千问等）- 默认使用OpenAI兼容格式
        response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.7,
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LLM API调用失败: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();

      // 提取响应内容
      if (this.provider === 'anthropic') {
        return data.content[0].text;
      } else {
        return data.choices[0].message.content;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM API调用超时（${timeout}ms）`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 解析情绪分析响应
   */
  private parseSentimentResponse(response: string): SentimentAnalysisResult {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        overallSentiment: parsed.overallSentiment || 'neutral',
        score: parseFloat(parsed.score) || 0.5,
        confidence: parseFloat(parsed.confidence) || 0.8,
        emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
        reasoning: parsed.reasoning || '无法解析分析理由',
      };
    } catch (error) {
      console.warn('[LLMClient] 解析情绪分析响应失败:', error, response);
      return {
        overallSentiment: 'neutral',
        score: 0.5,
        confidence: 0.5,
        emotions: [],
        reasoning: '解析失败，降级到默认值',
      };
    }
  }

  /**
   * 解析意图提取响应
   */
  private parseIntentResponse(response: string): IntentExtractionResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        isQuestion: parsed.isQuestion || false,
        intent: parsed.intent || 'inquiry',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        entities: parsed.entities || {},
        confidence: parseFloat(parsed.confidence) || 0.7,
      };
    } catch (error) {
      console.warn('[LLMClient] 解析意图提取响应失败:', error, response);
      return {
        isQuestion: false,
        intent: 'inquiry',
        keywords: [],
        entities: {},
        confidence: 0.5,
      };
    }
  }

  /**
   * 解析回复生成响应
   */
  private parseReplyResponse(response: string): ReplyGenerationResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        suggestedReply: parsed.suggestedReply || '无法生成回复建议',
        confidence: parseFloat(parsed.confidence) || 0.7,
        reasoning: parsed.reasoning || '无',
      };
    } catch (error) {
      console.warn('[LLMClient] 解析回复生成响应失败:', error, response);
      return {
        suggestedReply: '抱歉，我暂时无法生成合适的回复建议。',
        confidence: 0.3,
        reasoning: '解析失败',
      };
    }
  }
}
