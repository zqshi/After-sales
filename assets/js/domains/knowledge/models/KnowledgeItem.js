import { generateId } from '../../../core/utils.js';
import { KnowledgeItemCreatedEvent } from '../events/KnowledgeItemCreatedEvent.js';
import { KnowledgeItemUpdatedEvent } from '../events/KnowledgeItemUpdatedEvent.js';

/**
 * KnowledgeItem - 知识条目聚合根
 */
export class KnowledgeItem {
  constructor(data = {}) {
    this.id = data.id || generateId('knowledge');
    this.title = data.title || '未命名知识';
    this.summary = data.summary || data.presetSummary || '';
    this.content = data.content || data.full || '';
    this.type = data.type || 'document';
    this.tags = Array.isArray(data.tags) ? [...new Set(data.tags)] : [];
    this.author = data.author || data.owner || 'system';
    this.status = data.status || 'draft';
    this.rating = {
      score: data.rating?.score ?? data.score ?? 0,
      votes: data.rating?.votes ?? data.votes ?? 0,
    };
    this.createdAt = data.createdAt || data.publishedAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;
    this._domainEvents = [];

    if (data.isNew) {
      this._addDomainEvent(
        new KnowledgeItemCreatedEvent({
          knowledgeId: this.id,
          title: this.title,
          summary: this.summary,
          type: this.type,
          tags: this.tags,
          author: this.author,
          createdAt: this.createdAt,
        }),
      );
    }
  }

  update(data = {}) {
    const changes = [];

    if (data.title && data.title !== this.title) {
      this.title = data.title;
      changes.push('title');
    }
    if (data.summary && data.summary !== this.summary) {
      this.summary = data.summary;
      changes.push('summary');
    }
    if (data.content && data.content !== this.content) {
      this.content = data.content;
      changes.push('content');
    }
    if (Array.isArray(data.tags)) {
      this.tags = [...new Set(data.tags)];
      changes.push('tags');
    }
    if (data.type && data.type !== this.type) {
      this.type = data.type;
      changes.push('type');
    }
    if (data.status && data.status !== this.status) {
      this.status = data.status;
      changes.push('status');
    }
    this.updatedAt = new Date().toISOString();

    if (changes.length) {
      this._addDomainEvent(
        new KnowledgeItemUpdatedEvent({
          knowledgeId: this.id,
          changes,
          updatedAt: this.updatedAt,
          status: this.status,
        }),
      );
    }
  }

  publish() {
    if (this.status === 'published') {
      return;
    }

    this.status = 'published';
    this.updatedAt = new Date().toISOString();

    this._addDomainEvent(
      new KnowledgeItemUpdatedEvent({
        knowledgeId: this.id,
        changes: ['status'],
        status: this.status,
        updatedAt: this.updatedAt,
      }),
    );
  }

  toCardDTO() {
    return {
      id: this.id,
      title: this.title,
      summary: this.summary,
      type: this.type,
      tags: this.tags,
      author: this.author,
      updatedAt: this.updatedAt,
      status: this.status,
    };
  }

  toDetailDTO() {
    return {
      id: this.id,
      title: this.title,
      summary: this.summary,
      content: this.content,
      type: this.type,
      tags: this.tags,
      author: this.author,
      status: this.status,
      rating: this.rating,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  _addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  getDomainEvents() {
    return [...this._domainEvents];
  }

  clearDomainEvents() {
    this._domainEvents = [];
  }
}
