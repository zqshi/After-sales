import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddServiceRecordUseCase } from '@application/use-cases/customer/AddServiceRecordUseCase';
import { buildCustomerProfile } from '../../../helpers/customerProfileFactory';

const customerProfileRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

describe('AddServiceRecordUseCase', () => {
  beforeEach(() => {
    customerProfileRepository.findById.mockReset();
    customerProfileRepository.save.mockReset();
  });

  it('throws when customerId missing', async () => {
    const useCase = new AddServiceRecordUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: '' } as any))
      .rejects.toThrow('customerId is required');
  });

  it('throws when customer missing', async () => {
    customerProfileRepository.findById.mockResolvedValue(null);
    const useCase = new AddServiceRecordUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1', title: 't', description: 'd' } as any))
      .rejects.toThrow('Customer not found: cust-1');
  });

  it('adds service record and saves', async () => {
    const profile = buildCustomerProfile({ customerId: 'cust-1' });
    customerProfileRepository.findById.mockResolvedValue(profile);
    const useCase = new AddServiceRecordUseCase(customerProfileRepository as any);

    const result = await useCase.execute({
      customerId: 'cust-1',
      title: 'Record',
      description: 'desc',
      ownerId: 'agent-1',
    });

    expect(result.customerId).toBe('cust-1');
    expect(result.serviceRecords).toHaveLength(1);
    expect(customerProfileRepository.save).toHaveBeenCalledTimes(1);
  });
});
