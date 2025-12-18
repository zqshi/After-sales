/**
 * HealthScoreCalculator - 客户健康度计算服务
 *
 * 负责根据画像中的满意度、互动频率、服务记录等指标，评估健康分数并生成评级。
 */
export class HealthScoreCalculator {
  constructor() {
    this.base = 40;
    this.satisfactionWeight = 0.4;
    this.interactionWeight = 0.2;
    this.serviceWeight = 0.2;
    this.riskWeight = 0.2;
  }

  /**
   * 计算画像健康得分
   * @param {CustomerProfile} profile
   * @returns {{score:number, rating:string, breakdown:Object}}
   */
  calculate(profile) {
    const satisfaction = this._getSatisfactionScore(profile);
    const interactionBonus = this._getInteractionBonus(profile);
    const serviceScore = this._getServiceCompletionScore(profile);
    const riskPenalty = this._getRiskPenalty(profile);

    const floatingScore =
      this.base +
      satisfaction * this.satisfactionWeight +
      interactionBonus * this.interactionWeight +
      serviceScore * this.serviceWeight -
      riskPenalty * this.riskWeight;

    const score = Math.min(100, Math.max(10, Math.round(floatingScore)));
    const rating = this._mapRating(score);

    return {
      score,
      rating,
      breakdown: {
        satisfaction,
        interactionBonus,
        serviceScore,
        riskPenalty,
      },
    };
  }

  _getSatisfactionScore(profile) {
    if (!profile?.metrics?.getSatisfactionScore) {
      return 60;
    }
    return Math.min(100, Math.max(0, profile.metrics.getSatisfactionScore()));
  }

  _getInteractionBonus(profile) {
    const interactionCount = profile?.interactions?.length || 0;
    return Math.min(20, interactionCount * 2);
  }

  _getServiceCompletionScore(profile) {
    const records = profile?.serviceRecords || [];
    if (!records.length) {
      return 5;
    }
    const completed = records.filter(record => record.isCompleted()).length;
    return Math.min(20, (completed / records.length) * 20);
  }

  _getRiskPenalty(profile) {
    const hasHighRisk = profile?.hasHighRiskCommitments();
    const overdueCount = profile?.getOverdueCommitments()?.length || 0;
    let penalty = overdueCount * 5;
    if (hasHighRisk) {
      penalty += 10;
    }
    return Math.min(30, penalty);
  }

  _mapRating(score) {
    if (score >= 85) {
      return 'excellent';
    }
    if (score >= 70) {
      return 'healthy';
    }
    if (score >= 55) {
      return 'attention';
    }
    return 'critical';
  }
}
