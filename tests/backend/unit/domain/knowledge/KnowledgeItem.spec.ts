import { beforeEach, describe, expect, it } from 'vitest';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

describe('KnowledgeItem aggregate', () => {
  let item: KnowledgeItem;

  beforeEach(() => {
    item = KnowledgeItem.create({
      title: 'Resolve login failure',
      content: 'Reset the password and clear cache.',
      category: KnowledgeCategory.create('troubleshooting'),
      tags: ['login', 'bug'],
      source: 'manual',
    });
    item.clearEvents();
  });

  it('can be updated and publishes update event', () => {
    item.update({
      title: 'Resolve login issues',
      content: 'Reset password, clear cache, and monitor logs.',
      tags: ['login', 'bug', 'monitoring'],
    });

    expect(item.title).toBe('Resolve login issues');
    expect(item.tags).toHaveLength(3);

    const events = item.getUncommittedEvents();
    expect(events.some((event) => event.eventType === 'KnowledgeItemUpdated')).toBe(true);
  });

  it('archives the item and publishes deletion event', () => {
    item.archive();

    expect(item.isArchived).toBe(true);
    expect(item.getUncommittedEvents().some((event) => event.eventType === 'KnowledgeItemDeleted')).toBe(true);
  });
});
