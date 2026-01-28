import { describe, expect, it } from 'vitest';
import { Interaction } from '@domain/customer/value-objects/Interaction';
import { Metrics } from '@domain/customer/value-objects/Metrics';
import { RiskEvaluator } from '@domain/customer/services/RiskEvaluator';

const buildInteractions = (count: number): Interaction[] => {
  return Array.from({ length: count }, () =>
    Interaction.create({
      interactionType: 'chat',
      occurredAt: new Date(),
      channel: 'web',
    }),
  );
};

describe('RiskEvaluator', () => {
  const evaluator = new RiskEvaluator();

  it('flags high risk when severity exceeds threshold', () => {
    const metrics = Metrics.create({
      satisfactionScore: 35,
      issueCount: 18,
      averageResolutionMinutes: 60,
    });

    const result = evaluator.evaluate({
      metrics,
      interactions: [],
    });

    expect(result).toBe('high');
  });

  it('returns medium risk when issues and interactions grow', () => {
    const metrics = Metrics.create({
      satisfactionScore: 60,
      issueCount: 5,
      averageResolutionMinutes: 50,
    });

    const result = evaluator.evaluate({
      metrics,
      interactions: buildInteractions(5),
    });

    expect(result).toBe('medium');
  });

  it('returns low risk when customer health is strong', () => {
    const metrics = Metrics.create({
      satisfactionScore: 92,
      issueCount: 1,
      averageResolutionMinutes: 20,
    });

    const result = evaluator.evaluate({
      metrics,
      interactions: buildInteractions(1),
    });

    expect(result).toBe('low');
  });
});
