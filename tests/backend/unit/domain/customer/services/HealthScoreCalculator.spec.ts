import { describe, expect, it } from 'vitest';
import { HealthScoreCalculator } from '@domain/customer/services/HealthScoreCalculator';
import { Metrics } from '@domain/customer/value-objects/Metrics';

describe('HealthScoreCalculator', () => {
  const calculator = new HealthScoreCalculator();

  it('calculates score with interaction bonus while staying within bounds', () => {
    const metrics = Metrics.create({
      satisfactionScore: 80,
      issueCount: 2,
      averageResolutionMinutes: 30,
    });

    const score = calculator.calculate({
      metrics,
      recentInteractions: 3,
    });

    expect(score).toBeCloseTo(86, 0);
  });

  it('never drops below zero when metrics are poor', () => {
    const metrics = Metrics.create({
      satisfactionScore: 0,
      issueCount: 30,
      averageResolutionMinutes: 120,
    });

    const score = calculator.calculate({
      metrics,
      recentInteractions: 0,
    });

    expect(score).toBe(0);
  });
});
