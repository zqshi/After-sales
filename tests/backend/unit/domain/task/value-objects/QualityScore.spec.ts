import { describe, expect, it } from 'vitest';
import { QualityScore } from '@domain/task/value-objects/QualityScore';

describe('QualityScore value object', () => {
  it('clamps values between 0 and 100 and calculates overall', () => {
    const score = QualityScore.create({
      timeliness: 120,
      completeness: -20,
      satisfaction: 200,
    });

    expect(score.timeliness).toBe(100);
    expect(score.completeness).toBe(0);
    expect(score.satisfaction).toBe(100);
    expect(score.overall).toBe(67); // (100 + 0 + 100) / 3 = 66.6 -> 67
  });
});

