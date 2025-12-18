import { generateId } from '../../../core/utils.js';

export class KnowledgeItemCreatedEvent {
  constructor(payload = {}) {
    this.eventType = 'KnowledgeItemCreated';
    this.eventId = payload.eventId || `evt-${generateId('knowledge')}`;
    this.occurredAt = payload.occurredAt || new Date().toISOString();
    this.knowledgeId = payload.knowledgeId;
    this.title = payload.title;
    this.summary = payload.summary;
    this.type = payload.type;
    this.tags = payload.tags || [];
    this.author = payload.author;
    this.createdAt = payload.createdAt || this.occurredAt;
  }
}
