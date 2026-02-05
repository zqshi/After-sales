import { generateId } from '../../../core/utils.js';

export const ReviewStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export class ReviewRequest {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.conversationId = data.conversationId;
    this.status = data.status || ReviewStatus.PENDING;
    this.suggestion = data.suggestion || {};
    this.confidence = data.confidence ?? null;
    this.reviewerId = data.reviewerId || null;
    this.reviewerNote = data.reviewerNote || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;
    this.resolvedAt = data.resolvedAt || null;
  }

  isPending() {
    return this.status === ReviewStatus.PENDING;
  }
}
