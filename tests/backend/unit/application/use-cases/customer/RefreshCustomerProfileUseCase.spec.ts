import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshCustomerProfileUseCase } from '@application/use-cases/customer/RefreshCustomerProfileUseCase';
import { buildCustomerProfile } from '../../../helpers/customerProfileFactory';

const customerProfileRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

describe('RefreshCustomerProfileUseCase', () => {
  beforeEach(() => {
    customerProfileRepository.findById.mockReset();
    customerProfileRepository.save.mockReset();
  });

  it('throws when customerId missing', async () => {
    const useCase = new RefreshCustomerProfileUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: '', source: 'sync' } as any))
      .rejects.toThrow('customerId is required');
  });

  it('throws when customer not found', async () => {
    customerProfileRepository.findById.mockResolvedValue(null);
    const useCase = new RefreshCustomerProfileUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1', source: 'sync' }))
      .rejects.toThrow('Customer not found: cust-1');
  });

  it('refreshes metrics and related data', async () => {
    const profile = buildCustomerProfile({ customerId: 'cust-1' });
    customerProfileRepository.findById.mockResolvedValue(profile);
    const useCase = new RefreshCustomerProfileUseCase(customerProfileRepository as any);

    const result = await useCase.execute({
      customerId: 'cust-1',
      source: 'sync',
      metrics: {
        satisfactionScore: 90,
        issueCount: 2,
        averageResolutionMinutes: 45,
      },
      insights: [{
        title: 'Insight',
        detail: 'Detail',
        createdAt: '2026-01-01T00:00:00Z',
      }],
      interactions: [{
        interactionType: 'call',
        occurredAt: '2026-01-02T00:00:00Z',
        notes: 'note',
      }],
      serviceRecords: [{
        title: 'Record',
        description: 'desc',
        recordedAt: '2026-01-03T00:00:00Z',
        ownerId: 'agent-1',
      }],
    });

    expect(result.customerId).toBe('cust-1');
    expect(result.metrics.satisfactionScore).toBe(90);
    expect(result.insights).toHaveLength(1);
    expect(result.interactions).toHaveLength(1);
    expect(result.serviceRecords).toHaveLength(1);
    expect(customerProfileRepository.save).toHaveBeenCalledTimes(1);
  });
});
