import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkCustomerAsVIPUseCase } from '@application/use-cases/customer/MarkCustomerAsVIPUseCase';
import { buildCustomerProfile } from '../../../helpers/customerProfileFactory';

const customerProfileRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

describe('MarkCustomerAsVIPUseCase', () => {
  beforeEach(() => {
    customerProfileRepository.findById.mockReset();
    customerProfileRepository.save.mockReset();
  });

  it('throws when customerId missing', async () => {
    const useCase = new MarkCustomerAsVIPUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: '' } as any))
      .rejects.toThrow('customerId is required');
  });

  it('throws when customer missing', async () => {
    customerProfileRepository.findById.mockResolvedValue(null);
    const useCase = new MarkCustomerAsVIPUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1' }))
      .rejects.toThrow('Customer not found: cust-1');
  });

  it('marks customer as vip and saves', async () => {
    const profile = buildCustomerProfile({ customerId: 'cust-1' });
    customerProfileRepository.findById.mockResolvedValue(profile);
    const useCase = new MarkCustomerAsVIPUseCase(customerProfileRepository as any);

    const result = await useCase.execute({ customerId: 'cust-1', reason: 'loyal' });

    expect(result.customerId).toBe('cust-1');
    expect(result.isVIP).toBe(true);
    expect(customerProfileRepository.save).toHaveBeenCalledTimes(1);
  });
});
