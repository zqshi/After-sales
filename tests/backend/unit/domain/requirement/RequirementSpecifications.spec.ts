import { describe, it, expect } from 'vitest';
import { Requirement } from '@domain/requirement/models/Requirement';
import { Priority } from '@domain/requirement/value-objects/Priority';
import { RequirementSource } from '@domain/requirement/value-objects/RequirementSource';
import {
  UrgentRequirementSpecification,
  HighPriorityRequirementSpecification,
  LowPriorityRequirementSpecification,
  PendingRequirementSpecification,
  InProgressRequirementSpecification,
  ResolvedRequirementSpecification,
  ClosedRequirementSpecification,
  CustomerInitiatedSpecification,
  ManuallyCreatedSpecification,
  FromConversationSpecification,
  ShouldAutoCreateTaskSpecification,
  NeedsCustomerCommunicationSpecification,
  BelongsToConversationSpecification,
  UnassignedRequirementSpecification,
  AssignedToSpecification,
  CategorySpecification,
  CreatedBetweenSpecification,
  UrgentTodoSpecification,
  AgentWorklistSpecification,
  RequiresImmediateAttentionSpecification,
  OpenBugSpecification,
} from '@domain/requirement/specifications/RequirementSpecifications';

const makeRequirement = (overrides: Record<string, unknown> = {}) => {
  const req = Requirement.create({
    customerId: 'cust',
    title: 'title',
    category: 'bug',
    priority: Priority.create('urgent'),
    source: RequirementSource.create('conversation'),
  });
  Object.assign(req as any, overrides);
  return req;
};

describe('RequirementSpecifications', () => {
  it('matches priority specs', () => {
    const req = Requirement.create({
      customerId: 'cust',
      title: 'title',
      category: 'general',
      priority: Priority.create('high'),
      source: RequirementSource.create('manual'),
    });

    expect(new UrgentRequirementSpecification().isSatisfiedBy(req)).toBe(true);
    expect(new HighPriorityRequirementSpecification().isSatisfiedBy(req)).toBe(true);
    expect(new LowPriorityRequirementSpecification().isSatisfiedBy(req)).toBe(false);
  });

  it('matches status specs', () => {
    const req = Requirement.create({
      customerId: 'cust',
      title: 'title',
      category: 'general',
      priority: Priority.create('low'),
      source: RequirementSource.create('manual'),
    });

    expect(new PendingRequirementSpecification().isSatisfiedBy(req)).toBe(true);
    expect(new InProgressRequirementSpecification().isSatisfiedBy(req)).toBe(false);
    expect(new ResolvedRequirementSpecification().isSatisfiedBy(req)).toBe(false);
    expect(new ClosedRequirementSpecification().isSatisfiedBy(req)).toBe(false);
  });

  it('matches source specs', () => {
    const req = Requirement.create({
      customerId: 'cust',
      title: 'title',
      category: 'general',
      priority: Priority.create('low'),
      source: RequirementSource.create('conversation'),
    });
    expect(new CustomerInitiatedSpecification().isSatisfiedBy(req)).toBe(true);
    expect(new ManuallyCreatedSpecification().isSatisfiedBy(req)).toBe(false);
    expect(new FromConversationSpecification().isSatisfiedBy(req)).toBe(true);
  });

  it('matches auto create task and needs communication', () => {
    const urgent = Requirement.create({
      customerId: 'cust',
      title: 'title',
      category: 'technical',
      priority: Priority.create('urgent'),
      source: RequirementSource.create('manual'),
    });

    expect(new ShouldAutoCreateTaskSpecification().isSatisfiedBy(urgent)).toBe(true);
    expect(new NeedsCustomerCommunicationSpecification().isSatisfiedBy(urgent)).toBe(true);
  });

  it('matches conversation and assignment specs', () => {
    const req = Requirement.create({
      customerId: 'cust',
      conversationId: 'conv-1',
      title: 'title',
      category: 'general',
      priority: Priority.create('medium'),
      source: RequirementSource.create('manual'),
    });
    (req as any).assigneeId = 'agent-1';

    expect(new BelongsToConversationSpecification('conv-1').isSatisfiedBy(req)).toBe(true);
    expect(new UnassignedRequirementSpecification().isSatisfiedBy(req)).toBe(false);
    expect(new AssignedToSpecification('agent-1').isSatisfiedBy(req)).toBe(true);
  });

  it('matches category and created between specs', () => {
    const req = Requirement.create({
      customerId: 'cust',
      title: 'title',
      category: 'bug',
      priority: Priority.create('low'),
      source: RequirementSource.create('manual'),
    });

    expect(new CategorySpecification('bug').isSatisfiedBy(req)).toBe(true);

    const start = new Date(req.createdAt.getTime() - 1000);
    const end = new Date(req.createdAt.getTime() + 1000);
    expect(new CreatedBetweenSpecification(start, end).isSatisfiedBy(req)).toBe(true);
  });

  it('matches composed specs', () => {
    const req = makeRequirement();
    (req as any).props.assigneeId = undefined;

    expect(new UrgentTodoSpecification().isSatisfiedBy(req)).toBe(true);
    expect(new AgentWorklistSpecification('agent-1').isSatisfiedBy(req)).toBe(false);
    expect(new RequiresImmediateAttentionSpecification().isSatisfiedBy(req)).toBe(true);
    expect(new OpenBugSpecification().isSatisfiedBy(req)).toBe(true);
  });
});
