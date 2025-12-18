import { describe, it, expect } from 'vitest';
import { RiskEvaluator } from '../RiskEvaluator.js';

describe('RiskEvaluator', () => {
  it('elevates risk for overdue commitments and low interaction count', () => {
    const evaluator = new RiskEvaluator();
    const profile = {
      getOverdueCommitments: () => [{ id: 'commitment-1' }],
      hasHighRiskCommitments: () => true,
      interactions: [],
      isVIP: () => false,
    };

    const result = evaluator.evaluate(profile);

    expect(result.level).toBe('high');
    expect(result.isCritical).toBe(true);
    expect(result.reasons).toContain('存在 1 条逾期承诺');
  });
});
