import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddInteractionUseCase } from '@application/use-cases/customer/AddInteractionUseCase';
import { buildCustomerProfile } from '../../../helpers/customerProfileFactory';

const customerProfileRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

describe('AddInteractionUseCase', () => {
  beforeEach(() => {
    customerProfileRepository.findById.mockReset();
    customerProfileRepository.save.mockReset();
  });

  it('throws when customerId missing', async () => {
    const useCase = new AddInteractionUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: '' } as any))
      .rejects.toThrow('customerId is required');
  });

  it('throws when customer missing', async () => {
    customerProfileRepository.findById.mockResolvedValue(null);
    const useCase = new AddInteractionUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1', interactionType: 'call' } as any))
      .rejects.toThrow('Customer not found: cust-1');
  });

  it('adds interaction and saves', async () => {
    const profile = buildCustomerProfile({ customerId: 'cust-1' });
    customerProfileRepository.findById.mockResolvedValue(profile);
    const useCase = new AddInteractionUseCase(customerProfileRepository as any);

    const result = await useCase.execute({
      customerId: 'cust-1',
      interactionType: 'email',
      occurredAt: '2026-01-01T00:00:00Z',
      notes: 'note',
    } as any);

    expect(result.customerId).toBe('cust-1');
    expect(result.interactions).toHaveLength(1);
    expect(customerProfileRepository.save).toHaveBeenCalledTimes(1);
  });
});
