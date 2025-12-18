import { describe, it, expect } from 'vitest';
import { HealthScoreCalculator } from '../HealthScoreCalculator.js';

describe('HealthScoreCalculator', () => {
  it('awards an excellent rating to high satisfaction and completed services', () => {
    const calculator = new HealthScoreCalculator();
    const profile = {
      metrics: {
        getSatisfactionScore: () => 96,
      },
      interactions: new Array(12).fill({}),
      serviceRecords: [
        { isCompleted: () => true },
        { isCompleted: () => true },
        { isCompleted: () => true },
      ],
      getOverdueCommitments: () => [],
      hasHighRiskCommitments: () => false,
    };

    const result = calculator.calculate(profile);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.rating).toBe('excellent');
  });
});
