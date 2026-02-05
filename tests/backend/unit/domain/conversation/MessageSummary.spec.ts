import { describe, it, expect } from 'vitest';
import { MessageSummary } from '@domain/conversation/value-objects/MessageSummary';

const makeMessage = (overrides: Partial<any> = {}) => ({
  id: 'm1',
  content: 'hello world',
  senderType: 'customer',
  sentAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

describe('MessageSummary', () => {
  it('creates empty summary', () => {
    const summary = MessageSummary.createEmpty();
    expect(summary.totalCount).toBe(0);
    expect(summary.isEmpty()).toBe(true);
  });

  it('validates non-negative counts', () => {
    expect(() =>
      MessageSummary.create({
        totalCount: -1,
        recentMessages: [],
        lastMessageAt: new Date(),
        lastMessageBy: 'system',
        unreadCount: 0,
      }),
    ).toThrow('totalCount must be non-negative');
  });

  it('trims recent messages to max length', () => {
    const messages = Array.from({ length: 7 }, (_, i) =>
      makeMessage({ id: `m${i}`, content: `msg${i}`, sentAt: new Date(2024, 0, i + 1) }),
    );
    const summary = MessageSummary.create({
      totalCount: 7,
      recentMessages: messages,
      lastMessageAt: messages[messages.length - 1].sentAt,
      lastMessageBy: 'customer',
    });
    expect(summary.recentMessages.length).toBe(5);
  });

  it('handles last message content and truncation', () => {
    const summary = MessageSummary.create({
      totalCount: 1,
      recentMessages: [makeMessage({ content: 'a'.repeat(60) })],
      lastMessageAt: new Date(),
      lastMessageBy: 'customer',
    });
    expect(summary.getLastMessageContent(10)).toBe('aaaaaaaaaa...');
  });

  it('updates with new message and unread count', () => {
    const summary = MessageSummary.create({
      totalCount: 1,
      recentMessages: [makeMessage({ senderType: 'agent' })],
      lastMessageAt: new Date(),
      lastMessageBy: 'agent',
      unreadCount: 0,
    });
    const updated = summary.withNewMessage(makeMessage({ senderType: 'customer' }));
    expect(updated.totalCount).toBe(2);
    expect(updated.unreadCount).toBe(1);
    expect(updated.lastMessageBy).toBe('customer');
  });

  it('marks messages as read', () => {
    const summary = MessageSummary.create({
      totalCount: 2,
      recentMessages: [makeMessage()],
      lastMessageAt: new Date(),
      lastMessageBy: 'customer',
      unreadCount: 2,
    });
    const read = summary.markAsRead();
    expect(read.unreadCount).toBe(0);
    const unchanged = read.markAsRead();
    expect(unchanged).toBe(read);
  });

  it('marks messages as read partially', () => {
    const summary = MessageSummary.create({
      totalCount: 2,
      recentMessages: [makeMessage()],
      lastMessageAt: new Date(),
      lastMessageBy: 'customer',
      unreadCount: 1,
    });
    const partial = summary.markAsReadPartial(1);
    expect(partial.unreadCount).toBe(0);
  });

  it('checks activity and idle', () => {
    const recent = MessageSummary.create({
      totalCount: 1,
      recentMessages: [makeMessage()],
      lastMessageAt: new Date(),
      lastMessageBy: 'customer',
      unreadCount: 1,
    });
    expect(recent.isRecentlyActive()).toBe(true);

    const old = MessageSummary.create({
      totalCount: 1,
      recentMessages: [makeMessage()],
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      lastMessageBy: 'customer',
      unreadCount: 1,
    });
    expect(old.isIdleForHours(4)).toBe(true);
  });

  it('returns activity description and statistics', () => {
    const summary = MessageSummary.create({
      totalCount: 4,
      recentMessages: [makeMessage()],
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastMessageBy: 'agent',
      unreadCount: 0,
    });
    expect(summary.getActivityDescription()).toContain('小时前');
    const stats = summary.getStatistics();
    expect(stats.totalMessages).toBe(4);
  });
});
