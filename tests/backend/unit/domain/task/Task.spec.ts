import { describe, expect, it, beforeEach } from 'vitest';
import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { QualityScore } from '@domain/task/value-objects/QualityScore';

describe('Task aggregate', () => {
  let task: Task;

  beforeEach(() => {
    task = Task.create({
      title: 'Follow up with customer',
      priority: TaskPriority.create('medium'),
    });
    task.clearEvents();
  });

  it('starts as pending and publishes created event upon creation', () => {
    const fresh = Task.create({
      title: 'New task for creation flow',
      priority: TaskPriority.create('medium'),
    });
    const events = fresh.getUncommittedEvents();

    expect(fresh.status).toBe('pending');
    expect(events.some((event) => event.eventType === 'TaskCreated')).toBe(true);
  });

  it('allows starting a pending task', () => {
    task.start('user-007');
    expect(task.status).toBe('in_progress');
    expect(task.startedAt).toBeInstanceOf(Date);
    expect(
      task.getUncommittedEvents().some((event) => event.eventType === 'TaskStarted'),
    ).toBe(true);

    expect(() => task.start()).toThrow('Only pending tasks can be started');
  });

  it('completes a task with quality score', () => {
    const score = QualityScore.create({
      timeliness: 85,
      completeness: 90,
      satisfaction: 80,
    });

    task.complete(score);
    expect(task.status).toBe('completed');
    expect(task.qualityScore?.overall).toBeGreaterThan(0);
    expect(
      task.getUncommittedEvents().some((event) => event.eventType === 'TaskCompleted'),
    ).toBe(true);
  });

  it('cancels a task gracefully', () => {
    task.cancel('no longer needed');
    expect(task.status).toBe('cancelled');
    expect(
      task.getUncommittedEvents().some((event) => event.eventType === 'TaskCancelled'),
    ).toBe(true);
  });

  it('reassigns and emits reassigned event', () => {
    task.reassign('agent-002');
    expect(task.assigneeId).toBe('agent-002');
    expect(
      task.getUncommittedEvents().some((event) => event.eventType === 'TaskReassigned'),
    ).toBe(true);
  });
});
