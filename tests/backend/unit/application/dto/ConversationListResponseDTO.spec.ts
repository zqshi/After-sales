import { describe, expect, it } from 'vitest';
import { ConversationListResponseDTO } from '@application/dto/ConversationListResponseDTO';
import { Conversation } from '@domain/conversation/models/Conversation';
import { Channel } from '@domain/conversation/value-objects/Channel';

const makeConversation = () => Conversation.create({
  customerId: 'cust-1',
  channel: Channel.fromString('chat'),
});

describe('ConversationListResponseDTO', () => {
  it('maps conversations without messages', () => {
    const convo = makeConversation();
    const dto = ConversationListResponseDTO.from([convo], 1, 1, 10);
    expect(dto.items[0].lastMessage).toBeUndefined();
  });

  it('maps conversations with last message', () => {
    const convo = makeConversation();
    convo.sendMessage({
      senderId: convo.customerId,
      senderType: 'customer',
      content: 'hello',
    });
    const dto = ConversationListResponseDTO.from([convo], 1, 1, 10);
    expect(dto.items[0].lastMessage?.content).toBe('hello');
  });
});
