import { generateId } from '../../../core/utils.js';

export const ProblemStatus = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  WAITING_CUSTOMER: 'waiting_customer',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
};

export class Problem {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.customerId = data.customerId;
    this.conversationId = data.conversationId;
    this.title = data.title || '';
    this.description = data.description || '';
    this.status = data.status || ProblemStatus.NEW;
    this.intent = data.intent || null;
    this.confidence = data.confidence ?? null;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;
    this.resolvedAt = data.resolvedAt || null;
  }

  isResolved() {
    return this.status === ProblemStatus.RESOLVED;
  }
}
