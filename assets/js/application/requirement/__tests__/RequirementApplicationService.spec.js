import { describe, it, expect, vi } from 'vitest';
import { RequirementApplicationService } from '../RequirementApplicationService.js';


describe('RequirementApplicationService', () => {
  it('createRequirement saves and publishes', async () => {
    const repo = { save: vi.fn().mockResolvedValue(undefined) };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new RequirementApplicationService({ requirementRepository: repo, eventBus });

    const result = await service.createRequirement({
      content: 'Need export',
      source: 'manual',
      conversationId: 'c1',
      customerId: 'u1',
      priority: 'high',
      confidence: 0.8,
    });

    expect(result.success).toBe(true);
    expect(repo.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('updateRequirementStatus handles transitions', async () => {
    const requirement = {
      id: 'REQ-1',
      status: 'pending',
      startProcessing: vi.fn(),
      complete: vi.fn(),
      reject: vi.fn(),
      getDomainEvents: vi.fn(() => [{ type: 'StatusChanged' }]),
      clearDomainEvents: vi.fn(),
    };
    const repo = {
      findById: vi.fn().mockResolvedValue(requirement),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new RequirementApplicationService({ requirementRepository: repo, eventBus });

    const result = await service.updateRequirementStatus({ requirementId: 'REQ-1', newStatus: 'processing', oldStatus: 'pending' });
    expect(result.success).toBe(true);
    expect(requirement.startProcessing).toHaveBeenCalled();

    await expect(service.updateRequirementStatus({ requirementId: 'REQ-1', newStatus: 'unknown' })).rejects.toThrow('不支持');
  });

  it('getRequirementList returns filters', async () => {
    const repo = {
      findAll: vi.fn().mockResolvedValue([{ id: 'REQ-1', content: 'c', status: 'pending', source: 'manual', priority: 'low', confidence: 1, conversationId: 'c1', customerId: 'u1', createdAt: 't1', updatedAt: 't2' }]),
    };
    const eventBus = { publish: vi.fn() };
    const service = new RequirementApplicationService({ requirementRepository: repo, eventBus });

    const result = await service.getRequirementList({ status: 'pending', source: 'manual', limit: 10, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.filters.status).toBe('pending');
  });

  it('getRequirement returns detail', async () => {
    const repo = { findById: vi.fn().mockResolvedValue({ id: 'REQ-1', content: 'c', status: 'pending', source: 'manual', priority: 'low', confidence: 1, conversationId: 'c1', customerId: 'u1', assignedTo: 'a1', createdAt: 't1', updatedAt: 't2' }) };
    const eventBus = { publish: vi.fn() };
    const service = new RequirementApplicationService({ requirementRepository: repo, eventBus });

    const result = await service.getRequirement('REQ-1');
    expect(result.id).toBe('REQ-1');
  });
});
