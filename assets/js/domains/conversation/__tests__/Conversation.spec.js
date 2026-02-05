import { describe, it, expect } from 'vitest';
import { Conversation, ConversationStatus, Priority, Message } from '../models/Conversation.js';
import { Channel } from '../models/Channel.js';
import { Participant } from '../models/Participant.js';


describe('Conversation domain model', () => {
  it('sends messages and tracks unread', () => {
    const convo = new Conversation({ customerId: 'c1', agentId: 'a1', agentName: 'Agent' });
    const msg = convo.sendMessage('u1', 'hello', { senderType: 'customer' });
    expect(msg).toBeInstanceOf(Message);
    expect(convo.messages.length).toBe(1);
    expect(convo.unreadCount).toBe(1);

    convo.sendMessage('a1', 'reply', { senderType: 'agent' });
    expect(convo.unreadCount).toBe(1);
    expect(convo.getCustomerMessages().length).toBe(1);
    expect(convo.getAgentMessages().length).toBe(1);
    expect(convo.getLastMessage().content).toBe('reply');
  });

  it('assigns agent and emits events', () => {
    const convo = new Conversation({ customerId: 'c1' });
    convo.assignAgent('a1', 'Agent');
    const events = convo.getDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('ConversationAssigned');
  });

  it('closes and reopens conversations', () => {
    const convo = new Conversation({ customerId: 'c1', agentId: 'a1', agentName: 'Agent' });
    convo.close('a1');
    expect(convo.status).toBe(ConversationStatus.CLOSED);
    expect(convo.closedAt).toBeTruthy();
    expect(() => convo.sendMessage('a1', 'nope')).toThrow();
    expect(() => convo.assignAgent('a2', 'Agent2')).toThrow();

    convo.reopen();
    expect(convo.status).toBe(ConversationStatus.OPEN);
  });

  it('validates priority updates and tags', () => {
    const convo = new Conversation({});
    expect(() => convo.updatePriority('invalid')).toThrow();
    convo.updatePriority(Priority.HIGH);
    expect(convo.priority).toBe(Priority.HIGH);

    convo.addTag('vip');
    convo.addTag('vip');
    expect(convo.tags).toEqual(['vip']);
    convo.removeTag('vip');
    expect(convo.tags).toEqual([]);
  });

  it('checks customer level violations', () => {
    const convo = new Conversation({ customerId: 'c1' });
    convo.sla.firstResponseElapsed = 20;
    convo.sla.firstResponseTarget = 10;
    expect(convo.checkCustomerLevelViolation()).toBe(true);
    const events = convo.getDomainEvents();
    expect(events.some((event) => event.eventType === 'CustomerLevelViolated')).toBe(true);
  });

  it('marks messages as read', () => {
    const convo = new Conversation({ customerId: 'c1' });
    convo.sendMessage('u1', 'hi', { senderType: 'customer' });
    convo.markMessagesAsRead();
    expect(convo.unreadCount).toBe(0);
    expect(convo.messages[0].isRead).toBe(true);
  });

  it('validates channel and participant equality', () => {
    expect(() => new Channel('invalid')).toThrow();
    const channel = new Channel('chat');
    expect(channel.toString()).toBe('chat');
    expect(channel.equals(new Channel('chat'))).toBe(true);

    const p1 = new Participant({ id: 'u1', name: 'Alice', type: 'customer' });
    const p2 = new Participant({ id: 'u1', name: 'Bob', type: 'agent' });
    expect(p1.equals(p2)).toBe(true);
  });
});
