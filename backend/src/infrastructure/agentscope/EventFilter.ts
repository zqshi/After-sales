const DEFAULT_BRIDGED_EVENT_TYPES = [
  'ConversationCreated',
  'ConversationAssigned',
  'MessageSent',
  'ConversationClosed',
  'CustomerLevelViolated',
  'RequirementCreated',
  'RequirementStatusChanged',
  'RequirementPriorityChanged',
  'TaskCreated',
  'TaskStarted',
  'TaskCompleted',
  'TaskCancelled',
  'TaskReassigned',
  'KnowledgeItemCreated',
  'KnowledgeItemUpdated',
  'KnowledgeItemDeleted',
  'CommitmentProgressUpdated',
  'ProfileRefreshed',
  'ServiceRecordAdded',
  'InteractionAdded',
  'CustomerMarkedAsVIP',
  'RiskLevelChanged',
  'ProblemCreated',
  'ProblemStatusChanged',
  'ProblemResolved',
  'ProblemReopened',
  'AgentReviewRequested',
  'AgentReviewCompleted',
];

export class EventFilter {
  private readonly allowed: Set<string>;

  constructor(eventTypes?: string[]) {
    this.allowed = new Set(eventTypes ?? DEFAULT_BRIDGED_EVENT_TYPES);
  }

  allows(eventType: string): boolean {
    return this.allowed.has(eventType);
  }

  get allowedEvents(): string[] {
    return Array.from(this.allowed);
  }
}

export const defaultEventFilter = new EventFilter();
