import { describe, expect, it, vi } from 'vitest';
import { RequirementController } from '@presentation/http/controllers/RequirementController';
import { ForbiddenError } from '@application/services/ResourceAccessControl';
import { ValidationError } from '@infrastructure/validation/Validator';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('RequirementController', () => {
  const createRequirementUseCase = { execute: vi.fn() };
  const getRequirementUseCase = { execute: vi.fn() };
  const listRequirementsUseCase = { execute: vi.fn() };
  const updateRequirementStatusUseCase = { execute: vi.fn() };
  const deleteRequirementUseCase = { execute: vi.fn() };
  const getRequirementStatisticsUseCase = { execute: vi.fn() };

  const controller = new RequirementController(
    createRequirementUseCase as any,
    getRequirementUseCase as any,
    listRequirementsUseCase as any,
    updateRequirementStatusUseCase as any,
    deleteRequirementUseCase as any,
    getRequirementStatisticsUseCase as any,
  );

  it('creates requirement', async () => {
    createRequirementUseCase.execute.mockResolvedValue({ id: 'r1' });
    const reply = makeReply();
    await controller.createRequirement({ body: { title: 'R' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('lists requirements', async () => {
    listRequirementsUseCase.execute.mockResolvedValue({ data: [] });
    const reply = makeReply();
    await controller.listRequirements({ query: { page: '1', limit: '10' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('ignores requirement', async () => {
    updateRequirementStatusUseCase.execute.mockResolvedValue({ id: 'r1' });
    const reply = makeReply();
    await controller.ignoreRequirement({ params: { id: 'r1' } } as any, reply as any);
    expect(updateRequirementStatusUseCase.execute).toHaveBeenCalledWith({
      requirementId: 'r1',
      status: 'ignored',
      userId: undefined,
    });
  });

  it('deletes requirement', async () => {
    deleteRequirementUseCase.execute.mockResolvedValue(undefined);
    const reply = makeReply();
    await controller.deleteRequirement({ params: { id: 'r1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(204);
  });

  it('handles validation error', async () => {
    createRequirementUseCase.execute.mockRejectedValue(new ValidationError('bad', []));
    const reply = makeReply();
    await controller.createRequirement({ body: {} } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('handles forbidden error', async () => {
    getRequirementUseCase.execute.mockRejectedValue(new ForbiddenError('nope'));
    const reply = makeReply();
    await controller.getRequirement({ params: { id: 'r1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('handles not found error', async () => {
    getRequirementUseCase.execute.mockRejectedValue(new Error('requirement not found'));
    const reply = makeReply();
    await controller.getRequirement({ params: { id: 'r1' } } as any, reply as any);
    expect(reply.code).toHaveBeenCalledWith(404);
  });
});
