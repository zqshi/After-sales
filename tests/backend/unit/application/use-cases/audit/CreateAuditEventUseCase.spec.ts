import { describe, expect, it, vi } from 'vitest';
import { CreateAuditEventUseCase } from '@application/use-cases/audit/CreateAuditEventUseCase';

const auditEventRepository = {
  create: vi.fn(),
};

describe('CreateAuditEventUseCase', () => {
  it('throws when missing action or resource', async () => {
    const useCase = new CreateAuditEventUseCase(auditEventRepository as any);
    await expect(
      useCase.execute({ action: '', resource: '' } as any, {}),
    ).rejects.toThrow('action and resource are required');
  });

  it('persists audit event with context', async () => {
    const useCase = new CreateAuditEventUseCase(auditEventRepository as any);

    await useCase.execute(
      { action: 'login', resource: 'session', metadata: { ok: true } } as any,
      { userId: 'u1', ip: '127.0.0.1', userAgent: 'ua' },
    );

    expect(auditEventRepository.create).toHaveBeenCalledTimes(1);
    const entity = auditEventRepository.create.mock.calls[0][0];
    expect(entity.action).toBe('login');
    expect(entity.resource).toBe('session');
    expect(entity.userId).toBe('u1');
    expect(entity.ip).toBe('127.0.0.1');
    expect(entity.userAgent).toBe('ua');
  });
});
