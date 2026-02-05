import { describe, expect, it, vi } from 'vitest';
import { CustomerActionController } from '@presentation/http/controllers/CustomerActionController';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('CustomerActionController', () => {
  const addServiceRecordUseCase = { execute: vi.fn() };
  const updateCommitmentProgressUseCase = { execute: vi.fn() };
  const addInteractionUseCase = { execute: vi.fn() };
  const markCustomerAsVIPUseCase = { execute: vi.fn() };

  const controller = new CustomerActionController(
    addServiceRecordUseCase as any,
    updateCommitmentProgressUseCase as any,
    addInteractionUseCase as any,
    markCustomerAsVIPUseCase as any,
  );

  it('adds service record', async () => {
    addServiceRecordUseCase.execute.mockResolvedValue({ id: 's1' });
    const reply = makeReply();
    await controller.addServiceRecord(
      { params: { id: 'c1' }, body: { title: 't', description: 'd' } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('updates commitment', async () => {
    updateCommitmentProgressUseCase.execute.mockResolvedValue({ id: 'c1' });
    const reply = makeReply();
    await controller.updateCommitment(
      { params: { id: 'c1', commitmentId: 'cm1' }, body: { progress: 20 } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('adds interaction', async () => {
    addInteractionUseCase.execute.mockResolvedValue({ id: 'c1' });
    const reply = makeReply();
    await controller.addInteraction(
      { params: { id: 'c1' }, body: { interactionType: 'call' } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('marks vip', async () => {
    markCustomerAsVIPUseCase.execute.mockResolvedValue({ id: 'c1' });
    const reply = makeReply();
    await controller.markAsVIP(
      { params: { id: 'c1' }, body: { reason: 'loyal' } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('handles error status mapping', async () => {
    addServiceRecordUseCase.execute.mockRejectedValue(new Error('customer not found'));
    const reply = makeReply();
    await controller.addServiceRecord(
      { params: { id: 'c1' }, body: { title: 't', description: 'd' } } as any,
      reply as any,
    );
    expect(reply.code).toHaveBeenCalledWith(404);
  });
});
