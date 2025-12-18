import { generateId } from '../../../core/utils.js';

/**
 * RequirementCreatedEvent - 需求创建事件
 */
export class RequirementCreatedEvent {
  constructor(payload = {}) {
    this.eventType = 'RequirementCreated';
    this.eventId = payload.eventId || `evt-${generateId('req')}`;
    this.occurredAt = payload.occurredAt || new Date().toISOString();
    this.requirementId = payload.requirementId;
    this.conversationId = payload.conversationId;
    this.customerId = payload.customerId;
    this.content = payload.content;
    this.source = payload.source;
    this.priority = payload.priority;
    this.confidence = payload.confidence;
    this.assignedTo = payload.assignedTo;
    this.createdAt = payload.createdAt || this.occurredAt;
  }
}
