import { describe, expect, it, vi } from 'vitest';
import { AuditController } from '@presentation/http/controllers/AuditController';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('AuditController', () => {
  it('creates audit event with user context', async () => {
    const createAuditEventUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
    const getReportSummaryUseCase = { execute: vi.fn() };
    const controller = new AuditController(createAuditEventUseCase as any, getReportSummaryUseCase as any);
    const reply = makeReply();

    await controller.createEvent(
      { body: { action: 'x' }, user: { sub: 'u1' }, ip: '127.0.0.1', headers: { 'user-agent': 'ua' } } as any,
      reply as any,
    );

    expect(createAuditEventUseCase.execute).toHaveBeenCalledTimes(1);
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('returns summary report', async () => {
    const createAuditEventUseCase = { execute: vi.fn() };
    const getReportSummaryUseCase = { execute: vi.fn().mockResolvedValue({ totalConversations: 1 }) };
    const controller = new AuditController(createAuditEventUseCase as any, getReportSummaryUseCase as any);
    const reply = makeReply();

    await controller.getSummary({ query: { days: '7' } } as any, reply as any);

    expect(getReportSummaryUseCase.execute).toHaveBeenCalledWith(7);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns 400 when create event fails', async () => {
    const createAuditEventUseCase = { execute: vi.fn().mockRejectedValue(new Error('bad')) };
    const getReportSummaryUseCase = { execute: vi.fn() };
    const controller = new AuditController(createAuditEventUseCase as any, getReportSummaryUseCase as any);
    const reply = makeReply();

    await controller.createEvent(
      { body: { action: '' }, user: { sub: 'u1' }, ip: '127.0.0.1', headers: {} } as any,
      reply as any,
    );

    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('returns 500 when summary fails', async () => {
    const createAuditEventUseCase = { execute: vi.fn() };
    const getReportSummaryUseCase = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
    const controller = new AuditController(createAuditEventUseCase as any, getReportSummaryUseCase as any);
    const reply = makeReply();

    await controller.getSummary({ query: {} } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});
