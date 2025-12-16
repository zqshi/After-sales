import { Metrics } from '../value-objects/Metrics';
import { Interaction } from '../value-objects/Interaction';

export interface RiskScoreOptions {
  metrics: Metrics;
  interactions: Interaction[];
}

export class RiskEvaluator {
  evaluate(options: RiskScoreOptions): 'low' | 'medium' | 'high' {
    const { metrics, interactions } = options;
    const severity = metrics.issueCount + interactions.length * 0.5;
    const satisfaction = metrics.satisfactionScore;

    if (severity > 15 || satisfaction < 40) {
      return 'high';
    }
    if (severity > 6 || satisfaction < 70) {
      return 'medium';
    }
    return 'low';
  }
}
