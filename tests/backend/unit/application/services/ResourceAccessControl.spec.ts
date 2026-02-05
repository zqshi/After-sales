import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceAccessControl } from '@application/services/ResourceAccessControl';

const conversationRepo = { findById: vi.fn() };
const taskRepo = { findById: vi.fn() };
const requirementRepo = { findById: vi.fn() };

describe('ResourceAccessControl', () => {
  beforeEach(() => {
    conversationRepo.findById.mockReset();
    taskRepo.findById.mockReset();
    requirementRepo.findById.mockReset();
  });

  it('denies conversation write for customer', async () => {
    conversationRepo.findById.mockResolvedValue({ customerId: 'u1', agentId: 'a1' });
    const access = new ResourceAccessControl(
      conversationRepo as any,
      taskRepo as any,
      requirementRepo as any,
    );

    await expect(access.checkConversationAccess('u1', 'c1', 'write'))
      .rejects.toThrow('Customers can only read conversations');
  });

  it('denies task write for non-assignee', async () => {
    taskRepo.findById.mockResolvedValue({ assigneeId: 'a1', createdBy: 'u1' });
    const access = new ResourceAccessControl(
      conversationRepo as any,
      taskRepo as any,
      requirementRepo as any,
    );

    await expect(access.checkTaskAccess('u1', 't1', 'write'))
      .rejects.toThrow('Only assignee can modify task');
  });

  it('denies task delete for non-creator', async () => {
    taskRepo.findById.mockResolvedValue({ assigneeId: 'u1', createdBy: 'u2' });
    const access = new ResourceAccessControl(
      conversationRepo as any,
      taskRepo as any,
      requirementRepo as any,
    );

    await expect(access.checkTaskAccess('u1', 't1', 'delete'))
      .rejects.toThrow('Only creator can delete task');
  });

  it('denies requirement write for customer', async () => {
    requirementRepo.findById.mockResolvedValue({ customerId: 'u1', createdBy: 'u2' });
    const access = new ResourceAccessControl(
      conversationRepo as any,
      taskRepo as any,
      requirementRepo as any,
    );

    await expect(access.checkRequirementAccess('u1', 'r1', 'write'))
      .rejects.toThrow('Customers can only read requirements');
  });
});
