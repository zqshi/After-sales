import { describe, expect, it, vi } from 'vitest';
import { CustomerProfileController } from '@presentation/http/controllers/CustomerProfileController';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('CustomerProfileController', () => {
  const getCustomerProfileUseCase = { execute: vi.fn() };
  const refreshCustomerProfileUseCase = { execute: vi.fn() };
  const getCustomerInteractionsUseCase = { execute: vi.fn() };

  const controller = new CustomerProfileController(
    getCustomerProfileUseCase as any,
    refreshCustomerProfileUseCase as any,
    getCustomerInteractionsUseCase as any,
  );

  it('gets profile', async () => {
    getCustomerProfileUseCase.execute.mockResolvedValue({ id: 'c1' });
    const reply = makeReply();
    await controller.getProfile({ params: { id: 'c1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('refreshes profile', async () => {
    refreshCustomerProfileUseCase.execute.mockResolvedValue({ id: 'c1' });
    const reply = makeReply();
    await controller.refreshProfile(
      { params: { id: 'c1' }, body: { source: 'sync' } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('gets interactions', async () => {
    getCustomerInteractionsUseCase.execute.mockResolvedValue([]);
    const reply = makeReply();
    await controller.getInteractions({ params: { id: 'c1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('handles error status mapping', async () => {
    getCustomerProfileUseCase.execute.mockRejectedValue(new Error('customer not found'));
    const reply = makeReply();
    await controller.getProfile({ params: { id: 'c1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(404);
  });
});
