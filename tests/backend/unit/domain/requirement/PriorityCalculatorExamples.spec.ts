import { describe, it, expect } from 'vitest';
import {
  calculateInitialPriority,
  reevaluatePriority,
  batchCalculatePriorities,
  customWeightsCalculation,
  CreateRequirementWithDynamicPriority,
  periodicReevaluation,
} from '@domain/requirement/services/PRIORITY_CALCULATOR_EXAMPLES';
import { RequirementPriorityCalculator } from '@domain/requirement/services/RequirementPriorityCalculator';

describe('PRIORITY_CALCULATOR_EXAMPLES', () => {
  it('runs calculateInitialPriority', async () => {
    await expect(calculateInitialPriority()).resolves.toBeUndefined();
  });

  it('runs reevaluatePriority and batch calculations', async () => {
    await expect(reevaluatePriority()).resolves.toBeUndefined();
    await expect(batchCalculatePriorities()).resolves.toBeUndefined();
  });

  it('runs custom weights calculation', async () => {
    await expect(customWeightsCalculation()).resolves.toBeUndefined();
  });

  it('creates requirement with dynamic priority', async () => {
    const useCase = new CreateRequirementWithDynamicPriority(
      new RequirementPriorityCalculator(),
    );
    const result = await useCase.execute({
      customerId: 'cust',
      title: 'title',
      description: 'desc',
      category: 'bug',
    });
    expect(result.priority).toBeDefined();
  });

  it('runs periodic reevaluation', async () => {
    await expect(periodicReevaluation()).resolves.toBeUndefined();
  });
});
