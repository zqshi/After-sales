import { describe, expect, it } from 'vitest';
import { QualityEvaluator } from '@domain/task/services/QualityEvaluator';
import { QualityScore } from '@domain/task/value-objects/QualityScore';

describe('QualityEvaluator service', () => {
  const evaluator = new QualityEvaluator();

  it('returns excellent for scores >= 90', () => {
    const score = QualityScore.create({ timeliness: 95, completeness: 90, satisfaction: 88 });
    const result = evaluator.evaluate(score);
    expect(result.level).toBe('excellent');
  });

  it('returns fair when score between 50 and 74', () => {
    const score = QualityScore.create({ timeliness: 50, completeness: 55, satisfaction: 60 });
    expect(evaluator.evaluate(score).level).toBe('fair');
  });

  it('returns poor when below 50', () => {
    const score = QualityScore.create({ timeliness: 30, completeness: 40, satisfaction: 45 });
    expect(evaluator.evaluate(score).level).toBe('poor');
  });
});
