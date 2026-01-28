import { describe, expect, it } from 'vitest';

import { EventFilter, defaultEventFilter } from '@infrastructure/agentscope/EventFilter';

describe('EventFilter utility', () => {
  it('allows default events such as MessageSent and ConversationCreated', () => {
    expect(defaultEventFilter.allows('MessageSent')).toBe(true);
    expect(defaultEventFilter.allows('ConversationCreated')).toBe(true);
  });

  it('can be scoped to a custom set of event types', () => {
    const customFilter = new EventFilter(['MessageSent']);
    expect(customFilter.allows('MessageSent')).toBe(true);
    expect(customFilter.allows('ConversationCreated')).toBe(false);
    expect(customFilter.allowedEvents).toEqual(['MessageSent']);
  });
});
