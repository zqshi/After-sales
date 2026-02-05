import { describe, it, expect, vi } from 'vitest';
import {
  example1_RepositoryQuery,
  example2_InMemoryFilter,
  example3_BusinessRuleValidation,
  example4_ExpressionSpecification,
  example5_ComplexQuery,
  businessCase1_AutoAssignUrgentTasks,
  businessCase2_RiskMonitoring,
  businessCase3_CustomerCare,
  businessCase4_WeeklyReport,
} from '@domain/SPECIFICATION_USAGE_EXAMPLES';
import { Requirement } from '@domain/requirement/models/Requirement';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';

const makeTask = (overrides: Record<string, any> = {}) => ({
  status: 'pending',
  assigneeId: undefined,
  completedAt: undefined,
  createdAt: new Date(),
  isOverdue: () => false,
  isHighPriority: () => false,
  belongsToConversation: (id: string) => id === 'conv-1',
  needsEscalation: () => false,
  canReassign: () => true,
  calculateDuration: () => 120,
  calculateRemainingTime: () => 20,
  ...overrides,
});

const makeRequirement = (overrides: Record<string, any> = {}) => {
  const req = Requirement.create({
    customerId: 'cust',
    conversationId: 'conv-1',
    title: 'title',
    category: 'bug',
    priority: Priority.create('urgent'),
    source: RequirementSource.create('conversation'),
  });
  Object.assign(req as any, overrides);
  return req;
};

describe('SPECIFICATION_USAGE_EXAMPLES', () => {
  it('runs repository query examples', async () => {
    const taskRepository = {
      findBySpecification: vi.fn().mockResolvedValue([]),
    };
    const result = await example1_RepositoryQuery(taskRepository as any, 'agent-1');
    expect(taskRepository.findBySpecification).toHaveBeenCalled();
    expect(result).toHaveProperty('overdueTasks');
  });

  it('filters tasks in memory', () => {
    const tasks = [
      makeTask({ isOverdue: () => true }),
      makeTask({ isHighPriority: () => true, belongsToConversation: () => true }),
      makeTask({ needsEscalation: () => true }),
    ];
    const result = example2_InMemoryFilter(tasks as any, 'conv-1');
    expect(result.overdueTasks.length).toBe(1);
    expect(result.tasksToEscalate.length).toBe(1);
  });

  it('validates business rules', () => {
    const req = makeRequirement();
    const task = makeTask({ needsEscalation: () => true }) as any;
    expect(() => example3_BusinessRuleValidation(req as any, task)).not.toThrow();
  });

  it('runs expression specification example', async () => {
    const taskRepository = {
      findBySpecification: vi.fn().mockResolvedValue([]),
    };
    const result = await example4_ExpressionSpecification(taskRepository as any, 60);
    expect(result).toHaveProperty('longRunningTasks');
  });

  it('runs complex query example', async () => {
    const taskRepository = {
      findBySpecification: vi.fn().mockResolvedValue([]),
    };
    const requirementRepository = {
      findBySpecification: vi.fn().mockResolvedValue([]),
    };
    const result = await example5_ComplexQuery(
      taskRepository as any,
      requirementRepository as any,
      'agent-1',
    );
    expect(result).toHaveProperty('urgentWorklist');
  });

  it('runs business case examples', async () => {
    const taskRepository = {
      findBySpecification: vi.fn().mockResolvedValue([makeTask()]),
    };
    const requirementRepository = {
      findBySpecification: vi.fn().mockResolvedValue([makeRequirement()]),
    };

    await businessCase1_AutoAssignUrgentTasks(taskRepository as any);
    await businessCase2_RiskMonitoring(taskRepository as any);
    await businessCase3_CustomerCare(requirementRepository as any);
    await businessCase4_WeeklyReport(taskRepository as any);

    expect(taskRepository.findBySpecification).toHaveBeenCalled();
    expect(requirementRepository.findBySpecification).toHaveBeenCalled();
  });
});
