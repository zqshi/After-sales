import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceAccessMiddleware } from '@presentation/http/middleware/resourceAccessMiddleware';
import { ForbiddenError } from '@application/services/ResourceAccessControl';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('ResourceAccessMiddleware', () => {
  const accessControl = {
    checkConversationAccess: vi.fn(),
    checkTaskAccess: vi.fn(),
    checkRequirementAccess: vi.fn(),
  };

  beforeEach(() => {
    accessControl.checkConversationAccess.mockReset();
    accessControl.checkTaskAccess.mockReset();
    accessControl.checkRequirementAccess.mockReset();
  });

  it('returns 401 when user missing', async () => {
    const middleware = new ResourceAccessMiddleware(accessControl as any);
    const handler = middleware.checkConversationAccess();

    const reply = makeReply();
    await handler({ user: undefined, params: { id: 'c1' } } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('returns 404 when conversation not found', async () => {
    accessControl.checkConversationAccess.mockRejectedValue(new Error('Conversation not found: c1'));
    const middleware = new ResourceAccessMiddleware(accessControl as any);
    const handler = middleware.checkConversationAccess();

    const reply = makeReply();
    await handler({ user: { sub: 'u1' }, params: { id: 'c1' } } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(404);
  });

  it('returns 400 when task id missing', async () => {
    const middleware = new ResourceAccessMiddleware(accessControl as any);
    const handler = middleware.checkTaskAccess();

    const reply = makeReply();
    await handler({ user: { sub: 'u1' }, params: {} } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('allows when access control passes', async () => {
    accessControl.checkRequirementAccess.mockResolvedValue(undefined);
    const middleware = new ResourceAccessMiddleware(accessControl as any);
    const handler = middleware.checkRequirementAccess();

    const reply = makeReply();
    await handler({ user: { sub: 'u1' }, params: { id: 'r1' } } as any, reply as any);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns 403 when forbidden', async () => {
    accessControl.checkTaskAccess.mockRejectedValue(new ForbiddenError('nope'));
    const middleware = new ResourceAccessMiddleware(accessControl as any);
    const handler = middleware.checkTaskAccess('write');

    const reply = makeReply();
    await handler({ user: { sub: 'u1' }, params: { id: 't1' } } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('throws unknown errors', async () => {
    accessControl.checkRequirementAccess.mockRejectedValue(new Error('boom'));
    const middleware = new ResourceAccessMiddleware(accessControl as any);
    const handler = middleware.checkRequirementAccess();

    await expect(
      handler({ user: { sub: 'u1' }, params: { id: 'r1' } } as any, makeReply() as any),
    ).rejects.toThrow('boom');
  });
});
