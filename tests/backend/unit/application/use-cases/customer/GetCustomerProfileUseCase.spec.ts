import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetCustomerProfileUseCase } from '@application/use-cases/customer/GetCustomerProfileUseCase';
import { buildCustomerProfile } from '../../../helpers/customerProfileFactory';

const customerProfileRepository = {
  findById: vi.fn(),
};

describe('GetCustomerProfileUseCase', () => {
  beforeEach(() => {
    customerProfileRepository.findById.mockReset();
  });

  it('throws when customerId missing', async () => {
    const useCase = new GetCustomerProfileUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: '' } as any))
      .rejects.toThrow('customerId is required');
  });

  it('throws when customer missing', async () => {
    customerProfileRepository.findById.mockResolvedValue(null);
    const useCase = new GetCustomerProfileUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1' }))
      .rejects.toThrow('Customer not found: cust-1');
  });

  it('returns profile dto', async () => {
    const profile = buildCustomerProfile({ customerId: 'cust-1' });
    customerProfileRepository.findById.mockResolvedValue(profile);
    const useCase = new GetCustomerProfileUseCase(customerProfileRepository as any);

    const result = await useCase.execute({ customerId: 'cust-1' });

    expect(result.customerId).toBe('cust-1');
    expect(result.name).toBe('Test Customer');
  });
});
