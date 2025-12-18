import { generateId } from '../../../core/utils.js';

export class KnowledgeItemUpdatedEvent {
  constructor(payload = {}) {
    this.eventType = 'KnowledgeItemUpdated';
    this.eventId = payload.eventId || `evt-${generateId('knowledge')}`;
    this.occurredAt = payload.occurredAt || new Date().toISOString();
    this.knowledgeId = payload.knowledgeId;
    this.changes = payload.changes || [];
    this.status = payload.status;
    this.updatedAt = payload.updatedAt || this.occurredAt;
  }
}
