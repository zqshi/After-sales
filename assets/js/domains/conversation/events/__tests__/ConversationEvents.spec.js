import { describe, it, expect } from 'vitest';
import { ConversationAssignedEvent } from '../ConversationAssignedEvent.js';
import { MessageSentEvent } from '../MessageSentEvent.js';
import { ConversationClosedEvent } from '../ConversationClosedEvent.js';
import { CustomerLevelViolatedEvent } from '../CustomerLevelViolatedEvent.js';

describe('conversation events', () => {
  it('creates and serializes ConversationAssignedEvent', () => {
    const event = new ConversationAssignedEvent({
      conversationId: 'c1',
      customerId: 'u1',
      agentId: 'a1',
      agentName: 'Agent',
      priority: 'high',
      channel: 'chat',
      reason: 'auto',
    });
    expect(event.isAutoAssigned()).toBe(true);
    expect(event.isReassignment()).toBe(false);

    const json = event.toJSON();
    expect(json.conversationId).toBe('c1');
    expect(ConversationAssignedEvent.fromJSON(json).conversationId).toBe('c1');
  });

  it('validates required fields for MessageSentEvent', () => {
    expect(() => new MessageSentEvent({})).toThrow();
    const event = new MessageSentEvent({
      conversationId: 'c1',
      messageId: 'm1',
      senderId: 'u1',
      senderType: 'customer',
      content: 'hello',
      channel: 'chat',
    });
    expect(event.isFromCustomer()).toBe(true);
    expect(event.isFromAgent()).toBe(false);
    expect(MessageSentEvent.fromJSON(event.toJSON()).messageId).toBe('m1');
  });

  it('creates ConversationClosedEvent and CustomerLevelViolatedEvent', () => {
    const closed = new ConversationClosedEvent({
      conversationId: 'c1',
      customerId: 'u1',
      closedBy: 'a1',
      resolution: 'resolved',
      duration: 10,
      messageCount: 2,
      agentId: 'a1',
      channel: 'chat',
      slaViolated: false,
      slaStatus: '达标',
    });
    expect(closed.toJSON().resolution).toBe('resolved');

    const violated = new CustomerLevelViolatedEvent({
      conversationId: 'c1',
      customerId: 'u1',
      violationType: 'firstResponse',
      expectedTime: 10,
      actualTime: 20,
      slaLevel: '银牌',
      severity: 'major',
      agentId: 'a1',
      agentName: 'Agent',
      channel: 'chat',
    });
    expect(violated.toJSON().violationType).toBe('firstResponse');
  });
});
