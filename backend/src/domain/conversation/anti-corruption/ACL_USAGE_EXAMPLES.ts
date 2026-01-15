/**
 * 防腐层（Anti-Corruption Layer）使用示例
 *
 * 本文件展示如何在Application层使用KnowledgeAdapter和CustomerAdapter
 * 来隔离Knowledge Context和Customer Context的模型变化
 */

import { KnowledgeAdapter } from '@domain/conversation/anti-corruption/KnowledgeAdapter';
import { CustomerAdapter } from '@domain/conversation/anti-corruption/CustomerAdapter';
import { IKnowledgeRepository } from '@domain/knowledge/repositories/IKnowledgeRepository';
import { ICustomerProfileRepository } from '@domain/customer/repositories/ICustomerProfileRepository';

/**
 * 示例1：在对话分配时使用CustomerAdapter
 *
 * 场景：ConversationAssignmentPolicyService需要客户信息来决定分配策略
 */
export class ConversationAssignmentExample {
  constructor(
    private readonly customerAdapter: CustomerAdapter,
  ) {}

  async assignConversation(conversationId: string, customerId: string) {
    // ✅ 通过防腐层获取客户信息
    const customerInfo = await this.customerAdapter.getCustomerInfo(customerId);

    if (!customerInfo) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // 根据客户等级选择分配策略
    if (customerInfo.tier === 'VIP') {
      console.log(`[VIP客户] 优先分配高质量客服`);
      // 执行VIP分配逻辑
    } else if (customerInfo.riskLevel === 'high') {
      console.log(`[高风险客户] 优先分配熟悉的客服`);
      // 执行高风险分配逻辑
    } else {
      console.log(`[常规客户] 使用标准分配策略`);
      // 执行常规分配逻辑
    }

    // 使用简化的DTO，而不是复杂的CustomerProfile聚合根
    return {
      conversationId,
      customerTier: customerInfo.tier,
      riskLevel: customerInfo.riskLevel,
      slaResponseTime: customerInfo.slaInfo.responseTime,
    };
  }

  async calculateAgentFamiliarity(customerId: string, agentId: string) {
    // ✅ 通过防腐层获取熟悉度信息
    const familiarity = await this.customerAdapter.getCustomerFamiliarity(
      customerId,
      agentId,
    );

    console.log(`客户${customerId}与客服${agentId}的熟悉度: ${familiarity.familiarityScore}`);
    console.log(`历史互动次数: ${familiarity.interactionCount}`);

    return familiarity.familiarityScore;
  }
}

/**
 * 示例2：在AI辅助对话时使用KnowledgeAdapter
 *
 * 场景：客服需要AI推荐相关知识库文章
 */
export class AIAssistantExample {
  constructor(
    private readonly knowledgeAdapter: KnowledgeAdapter,
  ) {}

  async getRecommendedKnowledge(
    conversationId: string,
    latestMessage: string,
  ) {
    // ✅ 通过防腐层搜索知识
    const recommendations = await this.knowledgeAdapter.getRecommendedKnowledge(
      conversationId,
      latestMessage,
      3, // 推荐3条
    );

    console.log(`为对话 ${conversationId} 推荐了 ${recommendations.length} 条知识`);

    // 使用简化的DTO，而不是KnowledgeItem聚合根
    return recommendations.map((k) => ({
      id: k.id,
      title: k.title,
      summary: k.content.substring(0, 100) + '...',
      relevanceScore: k.relevanceScore,
    }));
  }

  async searchKnowledgeForAgent(query: string) {
    // ✅ 通过防腐层搜索
    const results = await this.knowledgeAdapter.searchKnowledge({
      query,
      limit: 10,
    });

    console.log(`搜索"${query}"找到 ${results.length} 条知识`);

    return results;
  }
}

/**
 * 示例3：在CustomerSupportSaga中使用防腐层
 *
 * 场景：SAGA协调器需要客户和知识信息来决策
 */
export class CustomerSupportSagaWithACL {
  constructor(
    private readonly customerAdapter: CustomerAdapter,
    private readonly knowledgeAdapter: KnowledgeAdapter,
  ) {}

  async processCustomerMessage(customerId: string, message: string) {
    // Step 1: 获取客户信息（通过防腐层）
    const customerInfo = await this.customerAdapter.getCustomerInfo(customerId);

    if (!customerInfo) {
      throw new Error('Customer not found');
    }

    // Step 2: 根据客户等级决定处理优先级
    const priority = this.decidePriority(customerInfo);

    // Step 3: 搜索相关知识（通过防腐层）
    const relevantKnowledge = await this.knowledgeAdapter.searchKnowledge({
      query: message,
      limit: 5,
    });

    // Step 4: 生成AI回复建议
    const aiSuggestion = this.generateAISuggestion(
      message,
      relevantKnowledge,
      customerInfo,
    );

    return {
      priority,
      aiSuggestion,
      needsHumanReview: customerInfo.tier === 'VIP' || customerInfo.riskLevel === 'high',
    };
  }

  private decidePriority(customerInfo: any): string {
    if (customerInfo.tier === 'VIP') {
      return 'urgent';
    }
    if (customerInfo.riskLevel === 'high') {
      return 'high';
    }
    return 'medium';
  }

  private generateAISuggestion(
    message: string,
    knowledge: any[],
    customerInfo: any,
  ): string {
    // TODO: 集成AI服务
    return `基于${knowledge.length}条知识库文章，建议回复...`;
  }
}

/**
 * 示例4：依赖注入配置（在Infrastructure层）
 *
 * 展示如何初始化防腐层适配器并注入到Application层
 */
export function setupAntiCorruptionLayers(
  knowledgeRepository: IKnowledgeRepository,
  customerProfileRepository: ICustomerProfileRepository,
) {
  // 创建防腐层适配器
  const knowledgeAdapter = new KnowledgeAdapter(knowledgeRepository);
  const customerAdapter = new CustomerAdapter(customerProfileRepository);

  // 注入到Application层的用例中
  return {
    knowledgeAdapter,
    customerAdapter,
  };
}

/**
 * 对比：不使用防腐层 vs 使用防腐层
 */

// ❌ 不使用防腐层（直接依赖外部上下文的领域模型）
export class BadExample {
  constructor(
    private readonly knowledgeRepository: IKnowledgeRepository,
    private readonly customerProfileRepository: ICustomerProfileRepository,
  ) {}

  async processMessage(customerId: string) {
    // 问题1: 直接依赖CustomerProfile复杂模型
    const profile = await this.customerProfileRepository.findById(customerId);

    // 问题2: Application层需要理解Customer Context的内部结构
    const isVIP = profile!.isVIP;
    const healthScore = profile!.calculateHealthScore(); // 调用聚合根方法
    const metrics = profile!.metrics; // 访问内部值对象

    // 问题3: 当Customer Context的模型变化时，这里都需要修改
    // 例如：如果CustomerProfile重构，删除isVIP字段，改为tier枚举，这里全部失效
  }
}

// ✅ 使用防腐层（通过适配器隔离）
export class GoodExample {
  constructor(private readonly customerAdapter: CustomerAdapter) {}

  async processMessage(customerId: string) {
    // 优势1: 只依赖简化的DTO
    const customerInfo = await this.customerAdapter.getCustomerInfo(customerId);

    // 优势2: Application层只关心Conversation上下文需要的信息
    const isVIP = customerInfo!.tier === 'VIP';
    const healthScore = customerInfo!.healthScore;

    // 优势3: 当Customer Context模型变化时，只需修改CustomerAdapter
    // Conversation Context无感知变化
  }
}

/**
 * 核心价值总结
 *
 * 1. 隔离性：Conversation Context不直接依赖Knowledge/Customer的领域模型
 * 2. 简化性：提供面向Conversation需求的简化DTO，而不是复杂的聚合根
 * 3. 稳定性：外部上下文变化时，只需修改适配器，Conversation无感知
 * 4. 可测试性：可以轻松Mock适配器，而不需要构造复杂的聚合根
 * 5. 清晰性：明确上下文边界，防止领域模型污染
 */
