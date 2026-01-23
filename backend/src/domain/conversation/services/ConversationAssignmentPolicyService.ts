/**
 * ConversationAssignmentPolicyService - 对话分配策略服务
 *
 * 职责：根据客户特征、客服能力、工作负载等因素，智能分配对话到最合适的客服
 *
 * 核心业务规则：
 * 1. VIP客户优先分配给高质量客服
 * 2. 高风险客户优先分配给熟悉的客服
 * 3. 紧急客户等级优先分配给低负载客服
 * 4. 常规情况综合评分最高者
 */

/**
 * 客服候选人信息
 */
export interface AssignmentCandidate {
  agentId: string;
  agentName: string;
  skillMatch: number;         // 0-1, 技能匹配度
  workload: number;           // 0-100, 当前工作负载百分比
  averageQuality: number;     // 0-100, 历史平均质量分
  customerFamiliarity: number; // 0-1, 与该客户的熟悉度（历史互动次数）
  isOnline: boolean;          // 是否在线
  averageResponseTime: number; // 平均响应时间（秒）
}

/**
 * 分配上下文
 */
export interface AssignmentContext {
  conversationId: string;
  customerId: string;
  customerTier: 'VIP' | 'KA' | 'Regular'; // 客户等级
  customerRiskLevel: 'low' | 'medium' | 'high'; // 风险等级
  conversationPriority: 'urgent' | 'high' | 'medium' | 'low'; // 优先级
  slaStatus: 'normal' | 'warning' | 'violated'; // 客户等级状态
  channel: string; // 渠道
  conversationTopic?: string; // 对话主题（可选）
}

/**
 * 分配结果
 */
export interface AssignmentResult {
  selectedAgentId: string | null;
  reason: string;
  score: number;
  alternatives: Array<{
    agentId: string;
    score: number;
    reason: string;
  }>;
}

export class ConversationAssignmentPolicyService {
  /**
   * 选择最佳客服
   *
   * @param context 分配上下文
   * @param candidates 候选客服列表
   * @returns 分配结果
   */
  selectBestAgent(
    context: AssignmentContext,
    candidates: AssignmentCandidate[],
  ): AssignmentResult {
    if (candidates.length === 0) {
      return {
        selectedAgentId: null,
        reason: '无可用客服',
        score: 0,
        alternatives: [],
      };
    }

    // 过滤：只保留在线客服
    const onlineCandidates = candidates.filter((c) => c.isOnline);
    if (onlineCandidates.length === 0) {
      return {
        selectedAgentId: null,
        reason: '无在线客服',
        score: 0,
        alternatives: [],
      };
    }

    // 规则1: VIP客户优先高质量客服
    if (context.customerTier === 'VIP') {
      return this.selectHighQualityAgent(context, onlineCandidates);
    }

    // 规则2: 高风险客户优先熟悉的客服
    if (context.customerRiskLevel === 'high') {
      return this.selectFamiliarAgent(context, onlineCandidates);
    }

    // 规则3: 紧急客户等级优先低负载客服
    if (context.slaStatus === 'warning' || context.conversationPriority === 'urgent') {
      return this.selectLowWorkloadAgent(context, onlineCandidates);
    }

    // 规则4: KA客户（大客户）综合高分客服
    if (context.customerTier === 'KA') {
      return this.selectComprehensiveHighScoreAgent(context, onlineCandidates);
    }

    // 规则5: 常规情况综合评分
    return this.selectByComprehensiveScore(context, onlineCandidates);
  }

  /**
   * 规则1: 选择高质量客服
   *
   * 排序标准：质量分 > 技能匹配 > 负载
   */
  private selectHighQualityAgent(
    context: AssignmentContext,
    candidates: AssignmentCandidate[],
  ): AssignmentResult {
    const scored = candidates.map((c) => ({
      agentId: c.agentId,
      score:
        c.averageQuality * 0.6 +         // 质量占60%
        c.skillMatch * 100 * 0.3 +       // 技能占30%
        (100 - c.workload) * 0.1,        // 负载占10%
      reason: `高质量客服（质量分${c.averageQuality.toFixed(1)}）`,
    }));

    return this.buildResult(scored, 'VIP客户分配给高质量客服');
  }

  /**
   * 规则2: 选择熟悉的客服
   *
   * 排序标准：熟悉度 > 质量分 > 负载
   */
  private selectFamiliarAgent(
    context: AssignmentContext,
    candidates: AssignmentCandidate[],
  ): AssignmentResult {
    const scored = candidates.map((c) => ({
      agentId: c.agentId,
      score:
        c.customerFamiliarity * 100 * 0.5 + // 熟悉度占50%
        c.averageQuality * 0.3 +             // 质量占30%
        (100 - c.workload) * 0.2,            // 负载占20%
      reason: `熟悉客户（熟悉度${(c.customerFamiliarity * 100).toFixed(0)}%）`,
    }));

    // 如果没有熟悉的客服（熟悉度都是0），降级到高质量策略
    const maxFamiliarity = Math.max(...candidates.map((c) => c.customerFamiliarity));
    if (maxFamiliarity < 0.1) {
      return this.selectHighQualityAgent(context, candidates);
    }

    return this.buildResult(scored, '高风险客户分配给熟悉的客服');
  }

  /**
   * 规则3: 选择低负载客服
   *
   * 排序标准：负载 > 响应速度 > 质量分
   */
  private selectLowWorkloadAgent(
    context: AssignmentContext,
    candidates: AssignmentCandidate[],
  ): AssignmentResult {
    const scored = candidates.map((c) => {
      // 响应时间转换为分数（越快分数越高）
      // 假设理想响应时间是30秒，最差是300秒
      const responseScore = Math.max(
        0,
        100 - (c.averageResponseTime / 300) * 100,
      );

      return {
        agentId: c.agentId,
        score:
          (100 - c.workload) * 0.5 +     // 负载占50%
          responseScore * 0.3 +          // 响应速度占30%
          c.averageQuality * 0.2,        // 质量占20%
        reason: `低负载快速响应（负载${c.workload.toFixed(0)}%，响应${c.averageResponseTime.toFixed(0)}s）`,
      };
    });

    return this.buildResult(scored, '紧急客户等级分配给低负载客服');
  }

  /**
   * 规则4: 综合高分客服（适用于KA客户）
   *
   * 排序标准：质量分 > 技能匹配 > 熟悉度 > 负载
   */
  private selectComprehensiveHighScoreAgent(
    context: AssignmentContext,
    candidates: AssignmentCandidate[],
  ): AssignmentResult {
    const scored = candidates.map((c) => ({
      agentId: c.agentId,
      score:
        c.averageQuality * 0.4 +           // 质量占40%
        c.skillMatch * 100 * 0.3 +         // 技能占30%
        c.customerFamiliarity * 100 * 0.2 + // 熟悉度占20%
        (100 - c.workload) * 0.1,          // 负载占10%
      reason: `综合高分（质量${c.averageQuality.toFixed(1)}，技能${(c.skillMatch * 100).toFixed(0)}%）`,
    }));

    return this.buildResult(scored, 'KA客户分配给综合高分客服');
  }

  /**
   * 规则5: 常规综合评分
   *
   * 排序标准：技能匹配 > 负载 > 质量分 > 熟悉度
   */
  private selectByComprehensiveScore(
    context: AssignmentContext,
    candidates: AssignmentCandidate[],
  ): AssignmentResult {
    const scored = candidates.map((c) => ({
      agentId: c.agentId,
      score:
        c.skillMatch * 100 * 0.4 +         // 技能占40%
        (100 - c.workload) * 0.3 +         // 负载占30%
        c.averageQuality * 0.2 +           // 质量占20%
        c.customerFamiliarity * 100 * 0.1, // 熟悉度占10%
      reason: `常规综合评分（技能${(c.skillMatch * 100).toFixed(0)}%，负载${c.workload.toFixed(0)}%）`,
    }));

    return this.buildResult(scored, '常规综合评分分配');
  }

  /**
   * 构建分配结果
   */
  private buildResult(
    scored: Array<{ agentId: string; score: number; reason: string }>,
    strategy: string,
  ): AssignmentResult {
    // 按分数降序排序
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 4); // 保留前3个备选

    return {
      selectedAgentId: best.agentId,
      reason: `${strategy}: ${best.reason}`,
      score: best.score,
      alternatives: alternatives.map((alt) => ({
        agentId: alt.agentId,
        score: alt.score,
        reason: alt.reason,
      })),
    };
  }

  /**
   * 判断客服是否过载
   *
   * @param workload 工作负载百分比
   * @returns 是否过载
   */
  isOverloaded(workload: number): boolean {
    return workload >= 90;
  }

  /**
   * 判断客服是否可用
   *
   * @param candidate 候选客服
   * @returns 是否可用
   */
  isAvailable(candidate: AssignmentCandidate): boolean {
    return candidate.isOnline && !this.isOverloaded(candidate.workload);
  }

  /**
   * 计算技能匹配度
   *
   * 基于对话主题和客服技能标签的匹配
   *
   * @param conversationTopic 对话主题（如 'refund', 'technical', 'complaint'）
   * @param agentSkills 客服技能标签列表
   * @returns 匹配度 0-1
   */
  calculateSkillMatch(
    conversationTopic: string | undefined,
    agentSkills: string[],
  ): number {
    if (!conversationTopic || agentSkills.length === 0) {
      return 0.5; // 默认中等匹配
    }

    const topicLower = conversationTopic.toLowerCase();
    const matchedSkills = agentSkills.filter((skill) =>
      skill.toLowerCase().includes(topicLower) ||
      topicLower.includes(skill.toLowerCase()),
    );

    if (matchedSkills.length === 0) {
      return 0.3; // 无匹配技能
    }

    // 线性递增，最多100%
    return Math.min(1.0, 0.5 + matchedSkills.length * 0.2);
  }

  /**
   * 计算客户熟悉度
   *
   * 基于历史互动次数
   *
   * @param historicalInteractions 历史互动次数
   * @returns 熟悉度 0-1
   */
  calculateCustomerFamiliarity(historicalInteractions: number): number {
    if (historicalInteractions === 0) {
      return 0;
    }

    // 对数曲线：1次=0.3, 5次=0.7, 10次=0.9, 20次+=1.0
    return Math.min(1.0, Math.log10(historicalInteractions + 1) / Math.log10(21));
  }
}
