import { beforeEach, describe, expect, it } from 'vitest';
import { Requirement } from '@domain/requirement/models/Requirement';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';

describe('Requirement aggregate', () => {
  let requirement: Requirement;

  beforeEach(() => {
    requirement = Requirement.create({
      customerId: 'CUST-REQ-UNIT',
      title: 'Need better API docs',
      category: 'documentation',
      priority: Priority.create('medium'),
      source: RequirementSource.create('manual'),
    });
  });

  it('starts in pending status and emits creation event', () => {
    const events = requirement.getUncommittedEvents();

    expect(requirement.status).toBe('pending');
    expect(events.some((event) => event.eventType === 'RequirementCreated')).toBe(true);
  });

  it('updates status and emits RequirementStatusChanged event', () => {
    requirement.clearEvents();
    requirement.updateStatus('approved');

    const events = requirement.getUncommittedEvents();

    expect(requirement.status).toBe('approved');
    expect(events.some((event) => event.eventType === 'RequirementStatusChanged')).toBe(true);
  });

  it('resolves, ignores, and cancels via helper methods', () => {
    requirement.clearEvents();
    requirement.resolve();
    expect(requirement.status).toBe('resolved');

    requirement.cancel();
    expect(requirement.status).toBe('cancelled');

    requirement.updateStatus('pending');
    requirement.ignore();
    expect(requirement.status).toBe('ignored');
  });

  it('changes priority and emits RequirementPriorityChanged event when needed', () => {
    requirement.clearEvents();
    requirement.changePriority(Priority.create('high'));

    const events = requirement.getUncommittedEvents();

    expect(requirement.priority.value).toBe('high');
    expect(events.some((event) => event.eventType === 'RequirementPriorityChanged')).toBe(true);
  });

  it('does not emit priority event if priority stays the same', () => {
    requirement.clearEvents();
    requirement.changePriority(Priority.create('medium'));

    const events = requirement.getUncommittedEvents();

    expect(events.some((event) => event.eventType === 'RequirementPriorityChanged')).toBe(false);
  });
});
