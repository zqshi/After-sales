import { describe, expect, it, vi } from 'vitest';
import { MonitoringController } from '@presentation/http/controllers/MonitoringController';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('MonitoringController', () => {
  it('lists alerts with status filter', async () => {
    const listUseCase = { execute: vi.fn().mockResolvedValue([{ id: 'a1' }]) };
    const controller = new MonitoringController({} as any, listUseCase as any, {} as any);
    const reply = makeReply();

    await controller.listAlerts({ query: { status: 'open' } } as any, reply);

    expect(listUseCase.execute).toHaveBeenCalledWith('open');
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('handles list errors', async () => {
    const listUseCase = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
    const controller = new MonitoringController({} as any, listUseCase as any, {} as any);
    const reply = makeReply();

    await controller.listAlerts({ query: {} } as any, reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('creates alerts', async () => {
    const createUseCase = { execute: vi.fn().mockResolvedValue({ id: 'a1' }) };
    const controller = new MonitoringController(createUseCase as any, {} as any, {} as any);
    const reply = makeReply();

    await controller.createAlert({ body: { title: 'A' } } as any, reply);

    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('handles create errors', async () => {
    const createUseCase = { execute: vi.fn().mockRejectedValue(new Error('invalid')) };
    const controller = new MonitoringController(createUseCase as any, {} as any, {} as any);
    const reply = makeReply();

    await controller.createAlert({ body: {} } as any, reply);

    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('resolves alerts', async () => {
    const resolveUseCase = { execute: vi.fn().mockResolvedValue({ id: 'a1' }) };
    const controller = new MonitoringController({} as any, {} as any, resolveUseCase as any);
    const reply = makeReply();

    await controller.resolveAlert({ params: { id: 'a1' } } as any, reply);

    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('handles resolve errors', async () => {
    const resolveUseCase = { execute: vi.fn().mockRejectedValue(new Error('not found')) };
    const controller = new MonitoringController({} as any, {} as any, resolveUseCase as any);
    const reply = makeReply();

    await controller.resolveAlert({ params: { id: 'a1' } } as any, reply);

    expect(reply.code).toHaveBeenCalledWith(404);
  });
});
