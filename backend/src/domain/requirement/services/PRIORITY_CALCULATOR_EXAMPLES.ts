/**
 * RequirementPriorityCalculator使用示例
 *
 * 展示如何在Application层使用动态优先级计算服务
 */

import { RequirementPriorityCalculator } from '@domain/requirement/services/RequirementPriorityCalculator';
import { Priority } from '@domain/requirement/value-objects/Priority';

/**
 * 示例1：创建需求时计算初始优先级
 */
export async function calculateInitialPriority() {
  // 创建计算器（使用默认权重）
  const calculator = new RequirementPriorityCalculator();

  // 构建计算上下文
  const context = {
    // 客户维度
    customerTier: 'VIP' as const,
    customerRiskLevel: 'high' as const,
    customerHealthScore: 45, // 健康分较低

    // 需求内容维度
    category: 'bug',
    emotionIntensity: 0.8, // AI分析的情感强度
    keywords: ['urgent', 'critical', 'production'],

    // 历史维度
    similarRequirementCount: 3, // 历史相似问题3次
    recentRequirementCount: 2, // 最近30天2个需求
    lastRequirementDays: 5, // 5天前有需求

    // SLA维度
    slaResponseTime: 15, // 15分钟内响应
    slaResolutionTime: 2, // 2小时内解决
    currentPendingRequirements: 8,
  };

  // 计算优先级
  const result = calculator.calculate(context);

  console.log('=== 优先级计算结果 ===');
  console.log(`优先级: ${result.priority.value}`);
  console.log(`综合得分: ${result.score}/100`);
  console.log(`\n得分细分:`);
  console.log(`  - 客户维度: ${result.breakdown.customerScore}`);
  console.log(`  - 内容维度: ${result.breakdown.contentScore}`);
  console.log(`  - 历史维度: ${result.breakdown.historyScore}`);
  console.log(`  - SLA维度: ${result.breakdown.slaScore}`);
  console.log(`\n理由: ${result.reason}`);

  // 预期结果：urgent（得分约85+）
  // 原因：VIP+高风险+bug类+情感强度高+紧急关键词+SLA严格
}

/**
 * 示例2：需求状态变化时重新评估
 */
export async function reevaluatePriority() {
  const calculator = new RequirementPriorityCalculator();

  // 当前优先级
  const currentPriority = Priority.create('medium');

  // 客户情况恶化后的新上下文
  const newContext = {
    customerTier: 'regular' as const,
    customerRiskLevel: 'high' as const, // 风险升级
    customerHealthScore: 30, // 健康分恶化

    category: 'feature',
    emotionIntensity: 0.6,

    similarRequirementCount: 5, // 相似问题增加
    recentRequirementCount: 4,
    lastRequirementDays: 2, // 最近活跃

    slaResponseTime: 60,
    slaResolutionTime: 8,
    currentPendingRequirements: 15, // 积压增加
  };

  // 重新评估
  const reevaluation = calculator.reevaluate(currentPriority, newContext);

  console.log('=== 优先级重新评估 ===');
  console.log(`是否需要调整: ${reevaluation.shouldChange}`);
  console.log(`新优先级: ${reevaluation.newPriority.value}`);
  console.log(`理由: ${reevaluation.reason}`);

  // 预期结果：需要升级到high
}

/**
 * 示例3：批量计算多个需求的优先级（用于排序）
 */
export async function batchCalculatePriorities() {
  const calculator = new RequirementPriorityCalculator();

  // 多个需求的上下文
  const contexts = [
    {
      // 需求1：VIP客户技术问题
      customerTier: 'VIP' as const,
      customerRiskLevel: 'low' as const,
      customerHealthScore: 85,
      category: 'technical',
      slaResponseTime: 30,
      slaResolutionTime: 4,
    },
    {
      // 需求2：普通客户紧急Bug
      customerTier: 'regular' as const,
      customerRiskLevel: 'medium' as const,
      customerHealthScore: 60,
      category: 'bug',
      emotionIntensity: 0.9,
      keywords: ['urgent', 'production'],
      slaResponseTime: 60,
      slaResolutionTime: 8,
    },
    {
      // 需求3：KA客户退款请求
      customerTier: 'KA' as const,
      customerRiskLevel: 'high' as const,
      customerHealthScore: 40,
      category: 'refund',
      similarRequirementCount: 4,
      slaResponseTime: 15,
      slaResolutionTime: 2,
    },
  ];

  // 批量计算（自动按得分排序）
  const results = calculator.calculateBatch(contexts);

  console.log('=== 批量优先级计算结果（按优先级降序）===');
  results.forEach((result, index) => {
    console.log(
      `\n需求${index + 1}: ${result.priority.value} (得分${result.score})`,
    );
    console.log(`  理由: ${result.reason}`);
  });

  // 预期排序：需求3（KA+高风险+退款） > 需求2（Bug+紧急） > 需求1（VIP技术）
}

/**
 * 示例4：自定义权重配置（针对特定业务场景）
 */
export async function customWeightsCalculation() {
  // 场景：客户满意度危机期，极度重视客户维度
  const crisisModeCalculator = new RequirementPriorityCalculator({
    customer: 0.5, // 客户维度权重提升到50%
    content: 0.25,
    history: 0.15,
    sla: 0.1,
  });

  const context = {
    customerTier: 'VIP' as const,
    customerRiskLevel: 'high' as const,
    customerHealthScore: 35,
    category: 'consultation', // 低优先级分类
    slaResponseTime: 120,
    slaResolutionTime: 24,
  };

  const result = crisisModeCalculator.calculate(context);

  console.log('=== 危机模式优先级计算 ===');
  console.log(`优先级: ${result.priority.value}`);
  console.log(`综合得分: ${result.score}`);
  console.log(
    `客户维度占比: ${((result.breakdown.customerScore * 0.5) / result.score) * 100}%`,
  );

  // 预期结果：即使是consultation类需求，也会因VIP+高风险得到high优先级
}

/**
 * 示例5：集成到CreateRequirementUseCase
 */
export class CreateRequirementWithDynamicPriority {
  constructor(
    private readonly priorityCalculator: RequirementPriorityCalculator,
    // ... 其他依赖
  ) {}

  async execute(request: {
    customerId: string;
    title: string;
    description: string;
    category: string;
    // 注意：不再需要手动传入priority
  }) {
    // 1. 获取客户信息（通过CustomerAdapter）
    const customerInfo = {
      tier: 'VIP' as const,
      riskLevel: 'high' as const,
      healthScore: 50,
    };

    // 2. AI分析需求内容（提取情感强度和关键词）
    const aiAnalysis = {
      emotionIntensity: 0.7,
      keywords: ['urgent'],
    };

    // 3. 查询历史需求
    const history = {
      similarRequirementCount: 2,
      recentRequirementCount: 1,
      lastRequirementDays: 10,
    };

    // 4. 获取SLA信息
    const sla = {
      responseTime: 30,
      resolutionTime: 4,
    };

    // 5. 动态计算优先级
    const priorityResult = this.priorityCalculator.calculate({
      customerTier: customerInfo.tier,
      customerRiskLevel: customerInfo.riskLevel,
      customerHealthScore: customerInfo.healthScore,
      category: request.category,
      emotionIntensity: aiAnalysis.emotionIntensity,
      keywords: aiAnalysis.keywords,
      similarRequirementCount: history.similarRequirementCount,
      recentRequirementCount: history.recentRequirementCount,
      lastRequirementDays: history.lastRequirementDays,
      slaResponseTime: sla.responseTime,
      slaResolutionTime: sla.resolutionTime,
    });

    console.log(
      `[CreateRequirement] 动态计算优先级: ${priorityResult.priority.value}`,
    );
    console.log(`[CreateRequirement] 计算理由: ${priorityResult.reason}`);

    // 6. 创建Requirement聚合根（使用计算出的优先级）
    // const requirement = Requirement.create({
    //   ...request,
    //   priority: priorityResult.priority,
    //   priorityScore: priorityResult.score, // 保存得分用于审计
    // });

    return {
      priority: priorityResult.priority,
      score: priorityResult.score,
      reason: priorityResult.reason,
    };
  }
}

/**
 * 示例6：定期重新评估所有待处理需求的优先级
 */
export async function periodicReevaluation() {
  const calculator = new RequirementPriorityCalculator();

  // 模拟待处理需求列表
  const pendingRequirements = [
    {
      id: 'req-1',
      currentPriority: Priority.create('medium'),
      customerId: 'cust-1',
    },
    {
      id: 'req-2',
      currentPriority: Priority.create('high'),
      customerId: 'cust-2',
    },
    {
      id: 'req-3',
      currentPriority: Priority.create('low'),
      customerId: 'cust-3',
    },
  ];

  console.log('=== 定期重新评估待处理需求 ===');

  for (const req of pendingRequirements) {
    // 获取最新上下文（客户情况可能已变化）
    const latestContext = {
      // ... 获取最新客户、SLA、历史数据
      customerTier: 'regular' as const,
      customerRiskLevel: 'medium' as const,
      customerHealthScore: 60,
      category: 'feature',
      slaResponseTime: 60,
      slaResolutionTime: 8,
    };

    // 重新评估
    const reevaluation = calculator.reevaluate(
      req.currentPriority,
      latestContext,
    );

    if (reevaluation.shouldChange) {
      console.log(`\n需求${req.id}需要调整优先级:`);
      console.log(`  ${req.currentPriority.value} → ${reevaluation.newPriority.value}`);
      console.log(`  理由: ${reevaluation.reason}`);

      // 更新需求优先级
      // await requirementRepository.updatePriority(req.id, reevaluation.newPriority);
    } else {
      console.log(`\n需求${req.id}优先级无需调整`);
    }
  }
}

/**
 * 核心价值总结
 *
 * 1. 动态性：基于多维度实时数据计算，而非硬编码规则
 * 2. 透明性：提供详细的得分细分和计算理由，便于审计
 * 3. 可配置：支持权重调整，适应不同业务场景
 * 4. 可重评估：支持需求状态变化时重新计算优先级
 * 5. 批量处理：支持批量计算和排序，提升效率
 *
 * 对比之前的硬编码方式：
 *
 * ❌ 之前（Application层硬编码）:
 * if (priority === 'urgent' || priority === 'high') {
 *   // 自动创建Task
 * }
 *
 * ✅ 现在（Domain层动态计算）:
 * const result = priorityCalculator.calculate(context);
 * if (result.priority.isUrgent()) {
 *   // 自动创建Task
 * }
 * // 还能看到计算理由和得分细分
 */
