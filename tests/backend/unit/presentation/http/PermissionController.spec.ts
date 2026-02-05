import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionController } from '@presentation/http/controllers/PermissionController';

const makeReply = () => {
  const reply: any = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
};

describe('PermissionController', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('lists roles and members', async () => {
    const listRolesUseCase = { execute: vi.fn().mockResolvedValue([{ id: 'r1' }]) };
    const listMembersUseCase = { execute: vi.fn().mockResolvedValue([{ id: 'u1' }]) };
    const controller = new PermissionController(
      listRolesUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      listMembersUseCase as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const replyRoles = makeReply();
    await controller.listRoles({} as any, replyRoles);
    expect(replyRoles.code).toHaveBeenCalledWith(200);
    expect(replyRoles.send.mock.calls[0][0].data[0].id).toBe('r1');

    const replyMembers = makeReply();
    await controller.listMembers({} as any, replyMembers);
    expect(replyMembers.code).toHaveBeenCalledWith(200);
    expect(replyMembers.send.mock.calls[0][0].data[0].id).toBe('u1');
  });

  it('creates, updates, deletes roles and refreshes permissions', async () => {
    const refresh = vi.fn();
    const controller = new PermissionController(
      {} as any,
      { execute: vi.fn().mockResolvedValue({ id: 'r1' }) } as any,
      { execute: vi.fn().mockResolvedValue({ id: 'r1', name: 'new' }) } as any,
      { execute: vi.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const requestBase = { server: { rolePermissionService: { refresh } } } as any;

    const replyCreate = makeReply();
    await controller.createRole({ ...requestBase, body: { name: 'Admin' } } as any, replyCreate);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(replyCreate.code).toHaveBeenCalledWith(201);

    const replyUpdate = makeReply();
    await controller.updateRole({ ...requestBase, params: { id: 'role-1' }, body: { name: 'X' } } as any, replyUpdate);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(replyUpdate.code).toHaveBeenCalledWith(200);

    const replyDelete = makeReply();
    await controller.deleteRole({ ...requestBase, params: { id: 'role-1' } } as any, replyDelete);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(replyDelete.code).toHaveBeenCalledWith(200);
  });

  it('creates and updates members', async () => {
    const controller = new PermissionController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { execute: vi.fn().mockResolvedValue({ id: 'm1' }) } as any,
      { execute: vi.fn().mockResolvedValue({ id: 'm1', role: 'admin' }) } as any,
      {} as any,
    );

    const replyCreate = makeReply();
    await controller.createMember({ body: { userId: 'u1' } } as any, replyCreate);
    expect(replyCreate.code).toHaveBeenCalledWith(201);

    const replyUpdate = makeReply();
    await controller.updateMember({ params: { id: 'm1' }, body: { role: 'admin' } } as any, replyUpdate);
    expect(replyUpdate.code).toHaveBeenCalledWith(200);
  });

  it('prevents deleting current user', async () => {
    const controller = new PermissionController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { execute: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.deleteMember({ params: { id: 'u1' }, user: { sub: 'u1' } } as any, reply);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send.mock.calls[0][0].error).toContain('cannot delete');
  });

  it('deletes members', async () => {
    const deleteMemberUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
    const controller = new PermissionController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      deleteMemberUseCase as any,
    );
    const reply = makeReply();

    await controller.deleteMember({ params: { id: 'u2' }, user: { sub: 'u1' } } as any, reply);

    expect(deleteMemberUseCase.execute).toHaveBeenCalledWith('u2');
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('maps errors to status codes', async () => {
    const cases = [
      ['not found', 404],
      ['already exists', 409],
      ['assigned to role', 409],
      ['cannot delete current user', 400],
      ['invalid payload', 400],
      ['required field missing', 400],
      ['boom', 500],
    ] as const;

    for (const [message, status] of cases) {
      const listRolesUseCase = { execute: vi.fn().mockRejectedValue(new Error(message)) };
      const controller = new PermissionController(
        listRolesUseCase as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
      const reply = makeReply();
      await controller.listRoles({} as any, reply);
      expect(reply.code).toHaveBeenCalledWith(status);
      expect(reply.send.mock.calls[0][0].success).toBe(false);
    }
  });
});
