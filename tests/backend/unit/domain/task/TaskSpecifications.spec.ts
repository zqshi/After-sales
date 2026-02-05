import { describe, it, expect } from 'vitest';
import {
  OverdueTaskSpecification,
  HighPriorityTaskSpecification,
  PendingTaskSpecification,
  AssignedToSpecification,
  BelongsToConversationSpecification,
  NeedsEscalationSpecification,
  UrgentTaskSpecification,
  AgentWorklistSpecification,
  RiskyTaskSpecification,
} from '@domain/task/specifications/TaskSpecifications';
import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';

const makeTask = () => Task.create({ title: 't1', priority: TaskPriority.create('high') });

describe('TaskSpecifications', () => {
  it('matches overdue and high priority', () => {
    const task = makeTask();
    (task as any).props.dueDate = new Date(Date.now() - 1000);
    expect(new OverdueTaskSpecification().isSatisfiedBy(task)).toBe(true);
    expect(new HighPriorityTaskSpecification().isSatisfiedBy(task)).toBe(true);
  });

  it('matches pending and assigned to agent', () => {
    const task = makeTask();
    (task as any).props.assigneeId = 'agent-1';
    expect(new PendingTaskSpecification().isSatisfiedBy(task)).toBe(true);
    expect(new AssignedToSpecification('agent-1').isSatisfiedBy(task)).toBe(true);
  });

  it('matches conversation and escalation', () => {
    const task = makeTask();
    (task as any).props.conversationId = 'conv-1';
    (task as any).props.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(new BelongsToConversationSpecification('conv-1').isSatisfiedBy(task)).toBe(true);
    expect(new NeedsEscalationSpecification().isSatisfiedBy(task)).toBe(true);
  });

  it('matches composed specs', () => {
    const task = makeTask();
    (task as any).props.assigneeId = 'agent-1';
    (task as any).props.dueDate = new Date(Date.now() - 1000);
    expect(new UrgentTaskSpecification().isSatisfiedBy(task)).toBe(true);
    expect(new AgentWorklistSpecification('agent-1').isSatisfiedBy(task)).toBe(true);
    expect(new RiskyTaskSpecification().isSatisfiedBy(task)).toBe(true);
  });
});
