import { generateId } from '../../../core/utils.js';

export class QualityReport {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.conversationId = data.conversationId;
    this.problemId = data.problemId || null;
    this.qualityScore = data.qualityScore ?? null;
    this.report = data.report || {};
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}
