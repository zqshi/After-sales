import { describe, it, expect } from 'vitest';
import { slaCalculator, SLACalculatorService } from '@domain/conversation/services/SLACalculatorService';

describe('SLACalculatorService', () => {
  it('should return normal for far future deadline', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const result = slaCalculator.evaluate(future);
    expect(result.status).toBe('normal');
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it('should return warning when deadline is within warning window', () => {
    const near = new Date(Date.now() + 5 * 60 * 1000);
    const result = slaCalculator.evaluate(near);
    expect(result.status).toBe('warning');
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it('should return violated for past deadline', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000);
    const result = slaCalculator.evaluate(past);
    expect(result.status).toBe('violated');
    expect(result.remainingMs).toBeLessThan(0);
  });

  it('should detect approaching deadlines', () => {
    const service = new SLACalculatorService(20);
    const near = new Date(Date.now() + 10 * 60 * 1000);
    expect(service.isApproaching(near)).toBe(true);
  });
});
