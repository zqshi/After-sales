import { CustomerLevelStatus } from '../types';

export interface CustomerLevelEvaluationResult {
  status: CustomerLevelStatus;
  remainingMs: number;
}

export class CustomerLevelCalculatorService {
  constructor(private warningWindowMinutes = 15) {}

  evaluate(deadline: Date, now: Date = new Date()): CustomerLevelEvaluationResult {
    const remainingMs = deadline.getTime() - now.getTime();

    if (remainingMs < 0) {
      return { status: 'violated', remainingMs };
    }

    const warningWindowMs = this.warningWindowMinutes * 60 * 1000;
    if (remainingMs <= warningWindowMs) {
      return { status: 'warning', remainingMs };
    }

    return { status: 'normal', remainingMs };
  }

  isApproaching(deadline: Date, now: Date = new Date()): boolean {
    const remainingMs = deadline.getTime() - now.getTime();
    if (remainingMs <= 0) {
      return false;
    }

    const warningWindowMs = this.warningWindowMinutes * 60 * 1000;
    return remainingMs <= warningWindowMs;
  }
}

export const slaCalculator = new CustomerLevelCalculatorService();
