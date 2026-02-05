import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateCommitmentProgressUseCase } from '@application/use-cases/customer/UpdateCommitmentProgressUseCase';
import { buildCustomerProfile } from '../../../helpers/customerProfileFactory';

const customerProfileRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

describe('UpdateCommitmentProgressUseCase', () => {
  beforeEach(() => {
    customerProfileRepository.findById.mockReset();
    customerProfileRepository.save.mockReset();
  });

  it('throws when customerId missing', async () => {
    const useCase = new UpdateCommitmentProgressUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: '', commitmentId: 'c1', progress: 10 } as any))
      .rejects.toThrow('customerId is required');
  });

  it('throws when commitmentId missing', async () => {
    const useCase = new UpdateCommitmentProgressUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1', commitmentId: '', progress: 10 } as any))
      .rejects.toThrow('commitmentId is required');
  });

  it('throws when customer missing', async () => {
    customerProfileRepository.findById.mockResolvedValue(null);
    const useCase = new UpdateCommitmentProgressUseCase(customerProfileRepository as any);
    await expect(useCase.execute({ customerId: 'cust-1', commitmentId: 'c1', progress: 10 }))
      .rejects.toThrow('Customer not found: cust-1');
  });

  it('updates commitment progress and saves', async () => {
    const profile = buildCustomerProfile({ customerId: 'cust-1' });
    customerProfileRepository.findById.mockResolvedValue(profile);
    const useCase = new UpdateCommitmentProgressUseCase(customerProfileRepository as any);

    const result = await useCase.execute({ customerId: 'cust-1', commitmentId: 'c1', progress: 30 });

    expect(result.customerId).toBe('cust-1');
    expect(result.commitments).toHaveLength(1);
    expect(customerProfileRepository.save).toHaveBeenCalledTimes(1);
  });
});
