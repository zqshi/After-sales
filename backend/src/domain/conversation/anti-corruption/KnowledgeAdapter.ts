/**
 * KnowledgeAdapter - 知识库防腐层
 *
 * 职责：隔离Knowledge Context的模型变化，防止其影响Conversation Context
 *
 * 核心价值：
 * 1. Conversation Context不直接依赖KnowledgeItem领域模型
 * 2. 提供面向Conversation需求的简化知识检索接口
 * 3. 当Knowledge模型变化时，只需修改此适配器，Conversation无感知
 *
 * 使用场景：
 * - AI辅助对话时需要检索相关知识
 * - 客服回复建议需要引用知识库
 * - 质检时需要验证知识准确性
 */

import { IKnowledgeRepository, KnowledgeFilters } from '@domain/knowledge/repositories/IKnowledgeRepository';

/**
 * Conversation上下文使用的知识DTO
 * 与KnowledgeItem领域模型隔离
 */
export interface ConversationKnowledgeDTO {
  id: string;
  title: string;
  content: string;
  category: string;
  relevanceScore?: number; // 相关度评分（可选，由AI计算）
  source: string;
}

/**
 * 知识检索请求（Conversation上下文专用）
 */
export interface KnowledgeSearchRequest {
  query: string; // 搜索关键词
  conversationContext?: string; // 对话上下文（可用于AI相关性计算）
  category?: string;
  limit?: number;
}

export class KnowledgeAdapter {
  constructor(private readonly knowledgeRepository: IKnowledgeRepository) {}

  /**
   * 搜索相关知识
   *
   * @param request - 搜索请求（Conversation上下文语义）
   * @returns 转换后的知识DTO列表
   */
  async searchKnowledge(
    request: KnowledgeSearchRequest,
  ): Promise<ConversationKnowledgeDTO[]> {
    // 转换Conversation上下文的请求 → Knowledge上下文的查询
    const filters: KnowledgeFilters = {
      query: request.query,
      category: request.category,
    };

    // 调用Knowledge Context的仓储
    const knowledgeItems = await this.knowledgeRepository.findByFilters(
      filters,
      {
        limit: request.limit ?? 10,
        offset: 0,
      },
    );

    // 转换KnowledgeItem领域模型 → ConversationKnowledgeDTO
    return knowledgeItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category.value,
      source: item.source,
      // TODO: 集成AI服务计算相关度
      relevanceScore: this.calculateRelevance(item.content, request.query),
    }));
  }

  /**
   * 获取指定分类的知识列表
   *
   * @param category - 知识分类
   * @param limit - 返回数量限制
   * @returns 知识DTO列表
   */
  async getKnowledgeByCategory(
    category: string,
    limit: number = 5,
  ): Promise<ConversationKnowledgeDTO[]> {
    const filters: KnowledgeFilters = { category };
    const knowledgeItems = await this.knowledgeRepository.findByFilters(
      filters,
      { limit, offset: 0 },
    );

    return knowledgeItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category.value,
      source: item.source,
    }));
  }

  /**
   * 根据标签获取知识
   *
   * @param tags - 标签列表
   * @param limit - 返回数量限制
   * @returns 知识DTO列表
   */
  async getKnowledgeByTags(
    tags: string[],
    limit: number = 5,
  ): Promise<ConversationKnowledgeDTO[]> {
    const filters: KnowledgeFilters = { tags };
    const knowledgeItems = await this.knowledgeRepository.findByFilters(
      filters,
      { limit, offset: 0 },
    );

    return knowledgeItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category.value,
      source: item.source,
    }));
  }

  /**
   * 获取知识详情（单个）
   *
   * @param knowledgeId - 知识ID
   * @returns 知识DTO或null
   */
  async getKnowledgeById(
    knowledgeId: string,
  ): Promise<ConversationKnowledgeDTO | null> {
    const item = await this.knowledgeRepository.findById(knowledgeId);
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category.value,
      source: item.source,
    };
  }

  /**
   * 批量获取知识详情
   *
   * @param knowledgeIds - 知识ID列表
   * @returns 知识DTO列表
   */
  async getKnowledgeByIds(
    knowledgeIds: string[],
  ): Promise<ConversationKnowledgeDTO[]> {
    const items = await Promise.all(
      knowledgeIds.map((id) => this.knowledgeRepository.findById(id)),
    );

    return items
      .filter((item) => item !== null)
      .map((item) => ({
        id: item!.id,
        title: item!.title,
        content: item!.content,
        category: item!.category.value,
        source: item!.source,
      }));
  }

  /**
   * 获取推荐知识（基于对话上下文）
   *
   * @param conversationId - 对话ID
   * @param messageContent - 最新消息内容
   * @param limit - 推荐数量
   * @returns 推荐知识列表（按相关度排序）
   */
  async getRecommendedKnowledge(
    conversationId: string,
    messageContent: string,
    limit: number = 3,
  ): Promise<ConversationKnowledgeDTO[]> {
    // 提取关键词（简单实现，生产环境应使用NLP）
    const keywords = this.extractKeywords(messageContent);

    // 搜索相关知识
    const results = await this.searchKnowledge({
      query: keywords.join(' '),
      conversationContext: messageContent,
      limit: limit * 2, // 获取更多候选，后续过滤
    });

    // 按相关度排序并返回Top N
    return results
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, limit);
  }

  /**
   * 辅助方法：计算相关度（简单实现）
   *
   * TODO: 集成AI服务或向量相似度计算
   */
  private calculateRelevance(content: string, query: string): number {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(/\s+/);

    let matches = 0;
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        matches++;
      }
    }

    // 简单相关度公式：匹配关键词数 / 总关键词数
    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  /**
   * 辅助方法：提取关键词（简单实现）
   *
   * TODO: 使用NLP库或AI服务
   */
  private extractKeywords(text: string): string[] {
    // 移除标点符号，分词
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    // 简单去重
    return [...new Set(words)];
  }
}
