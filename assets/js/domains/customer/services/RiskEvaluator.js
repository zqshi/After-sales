/**
 * RiskEvaluator - 客户风险评估服务
 *
 * 负责综合承诺风险、互动频率以及VIP标签等信号，给出风险等级。
 */
export class RiskEvaluator {
  /**
   * 分析画像并返回风险评估
   * @param {CustomerProfile} profile
   * @returns {{level:string,severity:string,reasons:Array<string>,isCritical:boolean}}
   */
  evaluate(profile) {
    const signals = [];
    const overdue = profile?.getOverdueCommitments()?.length || 0;
    const highRiskCommitments = profile?.hasHighRiskCommitments();
    const lowInteraction = (profile?.interactions?.length || 0) < 2;

    if (overdue > 0) {
      signals.push(`存在 ${overdue} 条逾期承诺`);
    }
    if (highRiskCommitments) {
      signals.push('包含高风险承诺');
    }
    if (lowInteraction) {
      signals.push('近期互动偏少，需跟进');
    }
    if (!profile?.isVIP()) {
      signals.push('非VIP客户，响应需优先');
    }

    const level = this._measureLevel(signals.length);
    return {
      level,
      severity: this._mapSeverity(level),
      reasons: signals,
      isCritical: level === 'high',
    };
  }

  _measureLevel(signalCount) {
    if (signalCount >= 3) {
      return 'high';
    }
    if (signalCount === 2) {
      return 'medium';
    }
    return signalCount === 1 ? 'low' : 'none';
  }

  _mapSeverity(level) {
    switch (level) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'warning';
      case 'low':
        return 'informational';
      default:
        return 'clear';
    }
  }
}
