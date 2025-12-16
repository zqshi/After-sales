import { QualityScore } from '../value-objects/QualityScore';

export interface QualityEvaluationResult {
  score: number;
  level: 'poor' | 'fair' | 'good' | 'excellent';
}

export class QualityEvaluator {
  evaluate(score: QualityScore): QualityEvaluationResult {
    const value = score.overall;
    let level: QualityEvaluationResult['level'] = 'poor';
    if (value >= 90) {
      level = 'excellent';
    } else if (value >= 75) {
      level = 'good';
    } else if (value >= 50) {
      level = 'fair';
    }

    return { score: value, level };
  }
}
