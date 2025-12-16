import { Metrics } from '../value-objects/Metrics';

export interface HealthScoreOptions {
  metrics: Metrics;
  recentInteractions?: number;
}

export class HealthScoreCalculator {
  calculate(options: HealthScoreOptions): number {
    const { metrics, recentInteractions = 0 } = options;

    const satisfactionFactor = metrics.satisfactionScore / 100;
    const interactionPenalty = Math.max(0, 5 - recentInteractions) * 0.05;
    const issuePenalty = Math.min(0.3, metrics.issueCount * 0.02);

    const base = satisfactionFactor - issuePenalty;
    return Math.max(0, Math.min(100, (base + interactionPenalty) * 100));
  }
}
