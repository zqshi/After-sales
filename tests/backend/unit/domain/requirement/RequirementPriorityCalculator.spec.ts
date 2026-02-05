import { describe, it, expect } from 'vitest';
import { RequirementPriorityCalculator } from '@domain/requirement/services/RequirementPriorityCalculator';
import { Priority } from '@domain/requirement/value-objects/Priority';

const baseContext = {
  customerTier: 'regular' as const,
  customerRiskLevel: 'low' as const,
  customerHealthScore: 80,
  category: 'consultation',
  emotionIntensity: 0.2,
  keywords: ['help'],
  similarRequirementCount: 0,
  recentRequirementCount: 0,
  lastRequirementDays: 60,
  slaResponseTime: 60,
  slaResolutionTime: 8,
  currentPendingRequirements: 0,
};

describe('RequirementPriorityCalculator', () => {
  it('throws when weights invalid', () => {
    expect(() => new RequirementPriorityCalculator({ customer: 0.9 })).toThrow(
      'Priority weights must sum to 1.0',
    );
  });

  it('calculates priority and breakdown', () => {
    const calculator = new RequirementPriorityCalculator();
    const result = calculator.calculate({
      ...baseContext,
      customerTier: 'VIP',
      customerRiskLevel: 'high',
      category: 'bug',
      emotionIntensity: 0.9,
      keywords: ['urgent'],
      similarRequirementCount: 5,
      lastRequirementDays: 3,
      slaResponseTime: 15,
      slaResolutionTime: 2,
      currentPendingRequirements: 20,
    });

    expect(result.priority.value).toBe('urgent');
    expect(result.breakdown.customerScore).toBeGreaterThan(70);
    expect(result.reason).toContain('VIP');
  });

  it('maps low score to low priority', () => {
    const calculator = new RequirementPriorityCalculator();
    const result = calculator.calculate({
      ...baseContext,
      customerTier: 'regular',
      customerRiskLevel: 'low',
      category: 'other',
      emotionIntensity: 0,
      slaResponseTime: 240,
      slaResolutionTime: 12,
    });
    expect(result.priority.value).toBe('low');
  });

  it('calculates batch and sorts by score', () => {
    const calculator = new RequirementPriorityCalculator();
    const results = calculator.calculateBatch([
      { ...baseContext, customerTier: 'VIP', category: 'bug' },
      { ...baseContext, customerTier: 'regular', category: 'consultation' },
    ]);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('reevaluates priority changes', () => {
    const calculator = new RequirementPriorityCalculator();
    const result = calculator.reevaluate(
      Priority.create('low'),
      { ...baseContext, customerTier: 'VIP', category: 'bug' },
    );
    expect(result.shouldChange).toBe(true);
    expect(result.reason).toContain('调整为');
  });
});
