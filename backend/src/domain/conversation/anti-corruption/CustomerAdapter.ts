/**
 * CustomerAdapter - 客户档案防腐层
 *
 * 职责：隔离Customer Context的复杂模型，为Conversation Context提供简化视图
 *
 * 核心价值：
 * 1. Conversation Context不直接依赖CustomerProfile复杂聚合根
 * 2. 提供面向对话分配和客户等级决策的简化客户信息
 * 3. 当Customer模型变化时，只需修改此适配器，Conversation无感知
 *
 * 使用场景：
 * - 对话分配时需要客户等级、风险等级
 * - 客户等级计算时需要客户合同信息
 * - 质检时需要客户历史服务质量
 * - AI分析时需要客户画像简介
 */

import { ICustomerProfileRepository } from '@domain/customer/repositories/ICustomerProfileRepository';

/**
 * Conversation上下文使用的客户DTO
 * 与CustomerProfile领域模型隔离
 */
export interface ConversationCustomerDTO {
  customerId: string;
  name: string;
  tier: 'VIP' | 'KA' | 'regular'; // 客户等级（简化）
  riskLevel: 'low' | 'medium' | 'high';
  healthScore: number; // 健康分（0-100）
  slaInfo: {
    responseTime: number; // 响应时长（分钟）
    resolutionTime: number; // 解决时长（小时）
  };
  recentInteractionCount: number; // 最近互动次数
  averageSatisfactionScore?: number; // 平均满意度
  primaryContact: {
    email?: string;
    phone?: string;
  };
}

/**
 * 客户简要信息（用于对话列表等轻量场景）
 */
export interface CustomerBriefInfo {
  customerId: string;
  name: string;
  isVIP: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 客户熟悉度信息（用于对话分配）
 */
export interface CustomerFamiliarityInfo {
  customerId: string;
  agentId: string;
  familiarityScore: number; // 0-1，基于历史互动
  lastInteractionDate?: Date;
  interactionCount: number;
}

export class CustomerAdapter {
  constructor(
    private readonly customerProfileRepository: ICustomerProfileRepository,
  ) {}

  /**
   * 获取客户完整信息（用于对话上下文）
   *
   * @param customerId - 客户ID
   * @returns 客户DTO或null
   */
  async getCustomerInfo(
    customerId: string,
  ): Promise<ConversationCustomerDTO | null> {
    const profile = await this.customerProfileRepository.findById(customerId);
    if (!profile) {
      return null;
    }

    // 转换CustomerProfile领域模型 → ConversationCustomerDTO
    return {
      customerId: profile.customerId,
      name: profile.name,
      tier: this.mapCustomerTier(profile.isVIP, profile.metrics),
      riskLevel: profile.riskLevel,
      healthScore: profile.calculateHealthScore(),
      slaInfo: {
        responseTime: profile.slaInfo.responseTime,
        resolutionTime: profile.slaInfo.resolutionTime,
      },
      recentInteractionCount: profile.interactions.length,
      averageSatisfactionScore: this.calculateAverageSatisfaction(
        profile.serviceRecords,
      ),
      primaryContact: {
        email: profile.contactInfo.email,
        phone: profile.contactInfo.phone,
      },
    };
  }

  /**
   * 获取客户简要信息（轻量级）
   *
   * @param customerId - 客户ID
   * @returns 简要信息或null
   */
  async getCustomerBriefInfo(
    customerId: string,
  ): Promise<CustomerBriefInfo | null> {
    const profile = await this.customerProfileRepository.findById(customerId);
    if (!profile) {
      return null;
    }

    return {
      customerId: profile.customerId,
      name: profile.name,
      isVIP: profile.isVIP,
      riskLevel: profile.riskLevel,
    };
  }

  /**
   * 批量获取客户简要信息
   *
   * @param customerIds - 客户ID列表
   * @returns 简要信息列表
   */
  async getCustomersBriefInfo(
    customerIds: string[],
  ): Promise<CustomerBriefInfo[]> {
    const profiles = await Promise.all(
      customerIds.map((id) => this.customerProfileRepository.findById(id)),
    );

    return profiles
      .filter((p) => p !== null)
      .map((profile) => ({
        customerId: profile!.customerId,
        name: profile!.name,
        isVIP: profile!.isVIP,
        riskLevel: profile!.riskLevel,
      }));
  }

  /**
   * 判断客户是否为VIP
   *
   * @param customerId - 客户ID
   * @returns 是否VIP
   */
  async isVIPCustomer(customerId: string): Promise<boolean> {
    const profile = await this.customerProfileRepository.findById(customerId);
    return profile?.isVIP ?? false;
  }

  /**
   * 判断客户是否为KA（大客户）
   *
   * @param customerId - 客户ID
   * @returns 是否KA客户
   */
  async isKACustomer(customerId: string): Promise<boolean> {
    const profile = await this.customerProfileRepository.findById(customerId);
    if (!profile) {
      return false;
    }

    // KA判断规则：年度合同金额 > 100万 或 签约承诺数 > 10
    const annualRevenue = profile.metrics.annualRevenue ?? 0;
    const commitmentCount = profile.commitments.length;

    return annualRevenue > 1_000_000 || commitmentCount > 10;
  }

  /**
   * 获取客户风险等级
   *
   * @param customerId - 客户ID
   * @returns 风险等级
   */
  async getCustomerRiskLevel(
    customerId: string,
  ): Promise<'low' | 'medium' | 'high' | null> {
    const profile = await this.customerProfileRepository.findById(customerId);
    return profile?.riskLevel ?? null;
  }

  /**
   * 获取客户健康分
   *
   * @param customerId - 客户ID
   * @returns 健康分（0-100）或null
   */
  async getCustomerHealthScore(customerId: string): Promise<number | null> {
    const profile = await this.customerProfileRepository.findById(customerId);
    return profile ? profile.calculateHealthScore() : null;
  }

  /**
   * 获取客户与指定客服的熟悉度
   *
   * @param customerId - 客户ID
   * @param agentId - 客服ID
   * @returns 熟悉度信息
   */
  async getCustomerFamiliarity(
    customerId: string,
    agentId: string,
  ): Promise<CustomerFamiliarityInfo> {
    const interactions =
      await this.customerProfileRepository.findInteractions(customerId);

    // 筛选与该客服的互动
    const agentInteractions = interactions.filter(
      (i: any) => i.agentId === agentId,
    );

    const interactionCount = agentInteractions.length;
    const lastInteractionDate =
      agentInteractions.length > 0
        ? new Date(agentInteractions[0].occurredAt)
        : undefined;

    // 计算熟悉度：基于互动次数和时效性
    const familiarityScore = this.calculateFamiliarityScore(
      interactionCount,
      lastInteractionDate,
    );

    return {
      customerId,
      agentId,
      familiarityScore,
      lastInteractionDate,
      interactionCount,
    };
  }

  /**
   * 获取客户的客户等级信息
   *
   * @param customerId - 客户ID
   * @returns 客户等级信息或null
   */
  async getCustomerCustomerLevel(customerId: string): Promise<{
    responseTime: number;
    resolutionTime: number;
  } | null> {
    const profile = await this.customerProfileRepository.findById(customerId);
    if (!profile) {
      return null;
    }

    return {
      responseTime: profile.slaInfo.responseTime,
      resolutionTime: profile.slaInfo.resolutionTime,
    };
  }

  /**
   * 获取客户最近的互动记录数量
   *
   * @param customerId - 客户ID
   * @param days - 最近N天（默认30天）
   * @returns 互动次数
   */
  async getRecentInteractionCount(
    customerId: string,
    days: number = 30,
  ): Promise<number> {
    const profile = await this.customerProfileRepository.findById(customerId);
    if (!profile) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return profile.interactions.filter(
      (i) => i.occurredAt >= cutoffDate,
    ).length;
  }

  /**
   * 辅助方法：映射客户等级
   */
  private mapCustomerTier(
    isVIP: boolean,
    metrics: any,
  ): 'VIP' | 'KA' | 'regular' {
    if (isVIP) {
      return 'VIP';
    }

    const annualRevenue = metrics.annualRevenue ?? 0;
    if (annualRevenue > 1_000_000) {
      return 'KA';
    }

    return 'regular';
  }

  /**
   * 辅助方法：计算平均满意度
   */
  private calculateAverageSatisfaction(serviceRecords: any[]): number {
    if (serviceRecords.length === 0) {
      return 0;
    }

    const scores = serviceRecords
      .map((r) => r.satisfactionScore)
      .filter((s) => s !== undefined && s !== null);

    if (scores.length === 0) {
      return 0;
    }

    const sum = scores.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / scores.length) * 10) / 10; // 保留1位小数
  }

  /**
   * 辅助方法：计算熟悉度评分
   *
   * 规则：
   * - 基础分：互动次数权重（最多0.7分）
   * - 时效性：最近互动时间权重（最多0.3分）
   */
  private calculateFamiliarityScore(
    interactionCount: number,
    lastInteractionDate?: Date,
  ): number {
    // 1. 互动次数得分（0-0.7）
    const countScore = Math.min(interactionCount / 20, 0.7); // 20次互动 = 满分

    // 2. 时效性得分（0-0.3）
    let recencyScore = 0;
    if (lastInteractionDate) {
      const daysSinceLastInteraction = Math.floor(
        (Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastInteraction <= 7) {
        recencyScore = 0.3; // 7天内 = 满分
      } else if (daysSinceLastInteraction <= 30) {
        recencyScore = 0.2; // 30天内 = 0.2分
      } else if (daysSinceLastInteraction <= 90) {
        recencyScore = 0.1; // 90天内 = 0.1分
      }
      // 90天以上 = 0分
    }

    return Math.round((countScore + recencyScore) * 100) / 100; // 保留2位小数
  }
}
