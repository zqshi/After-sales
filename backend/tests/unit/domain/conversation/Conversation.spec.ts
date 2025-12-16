import { describe, it, expect, beforeEach } from 'vitest';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';

describe('Conversation Aggregate', () => {
  let conversation: Conversation;

  beforeEach(() => {
    conversation = Conversation.create({
      customerId: 'customer-001',
      channel: Channel.fromString('chat'),
    });
    conversation.clearEvents();
  });

  it('should initialize in open status', () => {
    expect(conversation.status).toBe('open');
    expect(conversation.customerId).toBe('customer-001');
    expect(conversation.channel.value).toBe('chat');
  });

  it('should record conversation created event', () => {
    const fresh = Conversation.create({
      customerId: 'customer-002',
      channel: Channel.fromString('email'),
    });
    const events = fresh.getUncommittedEvents();
    expect(events.some((e) => e.eventType === 'ConversationCreated')).toBe(true);
  });

  it('should add a message and emit event', () => {
    conversation.sendMessage({
      senderId: 'agent-001',
      senderType: 'agent',
      content: 'Hello from agent',
    });

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].content).toBe('Hello from agent');

    const events = conversation.getUncommittedEvents();
    expect(events.some((event) => event.eventType === 'MessageSent')).toBe(true);
  });

  it('should emit assignment event when agent is assigned', () => {
    conversation.assignAgent('agent-002');

    expect(conversation.agentId).toBe('agent-002');

    const events = conversation.getUncommittedEvents();
    expect(events.some((event) => event.eventType === 'ConversationAssigned')).toBe(true);
  });

  it('should not allow messages when closed', () => {
    conversation.close('resolved');
    expect(() => {
      conversation.sendMessage({
        senderId: 'agent-002',
        senderType: 'agent',
        content: 'Should fail',
      });
    }).toThrow('无法向已关闭的对话发送消息');
  });

  it('should emit SLA violation events when deadline passes', () => {
    const pastDeadline = new Date(Date.now() - 60 * 60 * 1000);
    conversation.setSLADeadline(pastDeadline);

    const status = conversation.checkSLAStatus();
    expect(status).toBe('violated');

    const events = conversation.getUncommittedEvents();
    expect(events.some((event) => event.eventType === 'SLAViolated')).toBe(true);
  });

  it('should close and emit conversation closed event', () => {
    conversation.close('resolved');
    expect(conversation.status).toBe('closed');
    expect(conversation.closedAt).toBeInstanceOf(Date);

    const events = conversation.getUncommittedEvents();
    expect(events.some((event) => event.eventType === 'ConversationClosed')).toBe(true);
  });
});
