import { describe, it, expect } from 'vitest';
import { Message, SenderType } from '@domain/conversation/models/Message';

describe('Message Entity', () => {
  const baseProps = {
    conversationId: 'conv-001',
    senderId: 'agent-001',
    senderType: 'agent' as SenderType,
    content: 'Hello world',
  };

  it('should create with default contentType and sentAt', () => {
    const message = Message.create(baseProps);
    expect(message.contentType).toBe('text');
    expect(message.sentAt).toBeInstanceOf(Date);
    expect(message.senderId).toBe(baseProps.senderId);
  });

  it('should respect provided metadata', () => {
    const metadata = { foo: 'bar' };
    const message = Message.create({
      ...baseProps,
      metadata,
      contentType: 'markdown',
    });

    expect(message.metadata).toEqual(metadata);
    expect(message.contentType).toBe('markdown');
  });
});
