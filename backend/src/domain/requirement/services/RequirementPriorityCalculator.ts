/**
 * RequirementPriorityCalculator - 需求优先级动态计算服务
 *
 * 职责：基于多维度因素动态计算需求优先级，而非硬编码规则
 *
 * 核心价值：
 * 1. 综合多个业务因素（客户等级、情感强度、历史频率、客户等级压力）
 * 2. 支持权重配置，灵活调整优先级策略
 * 3. 提供透明的计算过程，便于审计和优化
 *
 * 使用场景：
 * - 新需求创建时计算初始优先级
 * - 需求状态变化时重新评估优先级
 * - 客户情况变化时动态调整优先级
 */

import { Priority } from '../value-objects/Priority';

/**
 * 优先级计算上下文
 */
export interface PriorityCalculationContext {
  // 客户维度
  customerTier: 'VIP' | 'KA' | 'regular';
  customerRiskLevel: 'low' | 'medium' | 'high';
  customerHealthScore: number; // 0-100

  // 需求内容维度
  category: string; // 需求分类
  emotionIntensity?: number; // 情感强度（0-1，由AI分析）
  keywords?: string[]; // 关键词（如"urgent"、"critical"等）

  // 历史维度
  similarRequirementCount?: number; // 相似需求历史次数
  recentRequirementCount?: number; // 最近30天需求数
  lastRequirementDays?: number; // 距离上次需求天数

  // 客户等级维度
  slaResponseTime: number; // 承诺响应时长（分钟）
  slaResolutionTime: number; // 承诺解决时长（小时）
  currentPendingRequirements?: number; // 当前待处理需求数
}

/**
 * 优先级计算结果
 */
export interface PriorityCalculationResult {
  priority: Priority;
  score: number; // 综合得分（0-100）
  breakdown: {
    customerScore: number; // 客户维度得分
    contentScore: number; // 内容维度得分
    historyScore: number; // 历史维度得分
    slaScore: number; // 客户等级维度得分
  };
  reason: string; // 计算理由
}

/**
 * 权重配置（可配置化）
 */
export interface PriorityWeights {
  customer: number; // 客户维度权重（默认0.35）
  content: number; // 内容维度权重（默认0.30）
  history: number; // 历史维度权重（默认0.20）
  sla: number; // 客户等级维度权重（默认0.15）
}

export class RequirementPriorityCalculator {
  private readonly weights: PriorityWeights;

  constructor(weights?: Partial<PriorityWeights>) {
    // 默认权重配置
    this.weights = {
      customer: weights?.customer ?? 0.35,
      content: weights?.content ?? 0.3,
      history: weights?.history ?? 0.2,
      sla: weights?.sla ?? 0.15,
    };

    // 确保权重和为1
    const total =
      this.weights.customer +
      this.weights.content +
      this.weights.history +
      this.weights.sla;
    if (Math.abs(total - 1.0) > 0.01) {
      throw new Error(`Priority weights must sum to 1.0, got ${total}`);
    }
  }

  /**
   * 计算需求优先级
   *
   * @param context - 计算上下文
   * @returns 计算结果
   */
  calculate(context: PriorityCalculationContext): PriorityCalculationResult {
    // 1. 计算各维度得分（0-100）
    const customerScore = this.calculateCustomerScore(context);
    const contentScore = this.calculateContentScore(context);
    const historyScore = this.calculateHistoryScore(context);
    const slaScore = this.calculateCustomerLevelScore(context);

    // 2. 加权综合得分
    const totalScore =
      customerScore * this.weights.customer +
      contentScore * this.weights.content +
      historyScore * this.weights.history +
      slaScore * this.weights.sla;

    // 3. 映射到Priority等级
    const priority = this.mapScoreToPriority(totalScore);

    // 4. 生成理由说明
    const reason = this.generateReason(
      context,
      totalScore,
      { customerScore, contentScore, historyScore, slaScore },
    );

    return {
      priority,
      score: Math.round(totalScore * 10) / 10, // 保留1位小数
      breakdown: {
        customerScore: Math.round(customerScore * 10) / 10,
        contentScore: Math.round(contentScore * 10) / 10,
        historyScore: Math.round(historyScore * 10) / 10,
        slaScore: Math.round(slaScore * 10) / 10,
      },
      reason,
    };
  }

  /**
   * 维度1：客户得分（0-100）
   *
   * 规则：
   * - VIP客户：基础分80，风险+10，健康分-20
   * - KA客户：基础分60，风险+10，健康分-20
   * - 普通客户：基础分40，风险+5，健康分-10
   */
  private calculateCustomerScore(context: PriorityCalculationContext): number {
    let score = 0;

    // 客户等级基础分
    switch (context.customerTier) {
      case 'VIP':
        score = 80;
        break;
      case 'KA':
        score = 60;
        break;
      case 'regular':
        score = 40;
        break;
    }

    // 风险等级加分
    switch (context.customerRiskLevel) {
      case 'high':
        score += context.customerTier === 'VIP' ? 10 : 5;
        break;
      case 'medium':
        score += context.customerTier === 'VIP' ? 5 : 2;
        break;
      case 'low':
        score += 0;
        break;
    }

    // 健康分调整（健康分越低，优先级越高）
    const healthPenalty =
      context.customerTier === 'VIP'
        ? (100 - context.customerHealthScore) * 0.2
        : (100 - context.customerHealthScore) * 0.1;
    score += healthPenalty;

    return Math.min(Math.max(score, 0), 100); // 限制在0-100
  }

  /**
   * 维度2：内容得分（0-100）
   *
   * 规则：
   * - 高优先级分类（bug、refund）：基础分70
   * - 中优先级分类（feature、technical）：基础分50
   * - 低优先级分类（consultation、other）：基础分30
   * - 情感强度加分：0-20分
   * - 关键词加分：最多+10分
   */
  private calculateContentScore(context: PriorityCalculationContext): number {
    let score = 0;

    // 分类基础分
    const highPriorityCategories = ['bug', 'refund', 'complaint'];
    const mediumPriorityCategories = ['feature', 'technical', 'performance'];

    if (highPriorityCategories.includes(context.category)) {
      score = 70;
    } else if (mediumPriorityCategories.includes(context.category)) {
      score = 50;
    } else {
      score = 30;
    }

    // 情感强度加分（0-20分）
    if (context.emotionIntensity !== undefined) {
      score += context.emotionIntensity * 20;
    }

    // 关键词加分（每个关键词+2.5分，最多4个）
    if (context.keywords && context.keywords.length > 0) {
      const urgentKeywords = [
        'urgent',
        'critical',
        'emergency',
        'asap',
        'immediately',
        '紧急',
        '严重',
        '马上',
      ];
      const matchedCount = context.keywords.filter((k) =>
        urgentKeywords.some((uk) => k.toLowerCase().includes(uk)),
      ).length;
      score += Math.min(matchedCount, 4) * 2.5;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * 维度3：历史得分（0-100）
   *
   * 规则：
   * - 相似需求频繁：基础分60 + 频次加分
   * - 最近活跃（7天内有需求）：+20分
   * - 长时间无需求（90天+）：-10分
   */
  private calculateHistoryScore(context: PriorityCalculationContext): number {
    let score = 50; // 默认中等分

    // 相似需求频次加分
    if (context.similarRequirementCount !== undefined) {
      if (context.similarRequirementCount >= 5) {
        score += 30; // 频繁问题，需重视
      } else if (context.similarRequirementCount >= 3) {
        score += 15;
      } else if (context.similarRequirementCount >= 1) {
        score += 5;
      }
    }

    // 最近活跃度调整
    if (context.lastRequirementDays !== undefined) {
      if (context.lastRequirementDays <= 7) {
        score += 20; // 最近有需求，持续关注
      } else if (context.lastRequirementDays <= 30) {
        score += 10;
      } else if (context.lastRequirementDays >= 90) {
        score -= 10; // 长时间无需求，优先级略降
      }
    }

    // 最近30天需求数调整
    if (context.recentRequirementCount !== undefined) {
      if (context.recentRequirementCount >= 10) {
        score += 15; // 近期需求频繁
      } else if (context.recentRequirementCount >= 5) {
        score += 8;
      }
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * 维度4：客户等级得分（0-100）
   *
   * 规则：
   * - 客户等级响应时间越短，得分越高
   * - 当前积压需求越多，得分越高
   */
  private calculateCustomerLevelScore(context: PriorityCalculationContext): number {
    let score = 50; // 默认中等分

    // 客户等级响应时间得分（响应时间越短，优先级越高）
    if (context.slaResponseTime <= 15) {
      score += 30; // 15分钟内响应 = 高优先级
    } else if (context.slaResponseTime <= 30) {
      score += 20; // 30分钟内响应
    } else if (context.slaResponseTime <= 60) {
      score += 10; // 1小时内响应
    } else if (context.slaResponseTime <= 120) {
      score += 5; // 2小时内响应
    }

    // 客户等级解决时间得分
    if (context.slaResolutionTime <= 2) {
      score += 15; // 2小时内解决 = 高优先级
    } else if (context.slaResolutionTime <= 4) {
      score += 10; // 4小时内解决
    } else if (context.slaResolutionTime <= 8) {
      score += 5; // 8小时内解决
    }

    // 当前积压需求数调整（积压越多，新需求优先级越高）
    if (context.currentPendingRequirements !== undefined) {
      if (context.currentPendingRequirements >= 20) {
        score += 10; // 严重积压
      } else if (context.currentPendingRequirements >= 10) {
        score += 5; // 轻度积压
      }
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * 映射得分到Priority等级
   *
   * 规则：
   * - 85-100: urgent
   * - 70-84: high
   * - 50-69: medium
   * - 0-49: low
   */
  private mapScoreToPriority(score: number): Priority {
    if (score >= 85) {
      return Priority.create('urgent');
    } else if (score >= 70) {
      return Priority.create('high');
    } else if (score >= 50) {
      return Priority.create('medium');
    } else {
      return Priority.create('low');
    }
  }

  /**
   * 生成计算理由
   */
  private generateReason(
    context: PriorityCalculationContext,
    totalScore: number,
    breakdown: {
      customerScore: number;
      contentScore: number;
      historyScore: number;
      slaScore: number;
    },
  ): string {
    const reasons: string[] = [];

    // 最高得分维度
    const maxDimension = Object.entries(breakdown).reduce((max, [key, value]) =>
      value > max[1] ? [key, value] : max,
    );
    const [maxKey, maxValue] = maxDimension;

    // 客户维度理由
    if (maxKey === 'customerScore' || breakdown.customerScore >= 70) {
      reasons.push(
        `${context.customerTier}客户（风险等级${context.customerRiskLevel}）`,
      );
    }

    // 内容维度理由
    if (maxKey === 'contentScore' || breakdown.contentScore >= 70) {
      reasons.push(`${context.category}类需求`);
      if (context.emotionIntensity && context.emotionIntensity >= 0.7) {
        reasons.push('情感强度高');
      }
    }

    // 历史维度理由
    if (maxKey === 'historyScore' || breakdown.historyScore >= 70) {
      if (
        context.similarRequirementCount &&
        context.similarRequirementCount >= 3
      ) {
        reasons.push(`历史相似需求${context.similarRequirementCount}次`);
      }
      if (context.lastRequirementDays && context.lastRequirementDays <= 7) {
        reasons.push('最近活跃');
      }
    }

    // 客户等级维度理由
    if (maxKey === 'slaScore' || breakdown.slaScore >= 70) {
      if (context.slaResponseTime <= 30) {
        reasons.push(`客户等级响应${context.slaResponseTime}分钟`);
      }
    }

    return reasons.length > 0
      ? `${reasons.join('，')}（综合得分${Math.round(totalScore)}）`
      : `综合评估得分${Math.round(totalScore)}`;
  }

  /**
   * 批量计算优先级
   *
   * @param contexts - 多个计算上下文
   * @returns 计算结果列表（按得分降序）
   */
  calculateBatch(
    contexts: PriorityCalculationContext[],
  ): PriorityCalculationResult[] {
    return contexts
      .map((ctx) => this.calculate(ctx))
      .sort((a, b) => b.score - a.score); // 按得分降序
  }

  /**
   * 重新评估优先级（用于需求状态变化时）
   *
   * @param currentPriority - 当前优先级
   * @param context - 新的计算上下文
   * @returns 是否需要升级/降级，以及新的优先级
   */
  reevaluate(
    currentPriority: Priority,
    context: PriorityCalculationContext,
  ): {
    shouldChange: boolean;
    newPriority: Priority;
    reason: string;
  } {
    const result = this.calculate(context);

    const shouldChange = result.priority.value !== currentPriority.value;

    return {
      shouldChange,
      newPriority: result.priority,
      reason: shouldChange
        ? `优先级从${currentPriority.value}调整为${result.priority.value}：${result.reason}`
        : '优先级无需调整',
    };
  }
}
