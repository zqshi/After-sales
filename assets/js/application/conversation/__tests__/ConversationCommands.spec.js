import { describe, it, expect } from 'vitest';
import { SendMessageCommand } from '../commands/SendMessageCommand.js';
import { AssignAgentCommand } from '../commands/AssignAgentCommand.js';
import { CloseConversationCommand } from '../commands/CloseConversationCommand.js';
import { GetConversationQuery } from '../queries/GetConversationQuery.js';


describe('Conversation commands', () => {
  it('SendMessageCommand validates required fields', () => {
    expect(() => new SendMessageCommand({})).toThrow('conversationId');
    expect(() => new SendMessageCommand({ conversationId: 'c1' })).toThrow('senderId');
    expect(() => new SendMessageCommand({ conversationId: 'c1', senderId: 'u1' })).toThrow('senderType');
    expect(() => new SendMessageCommand({ conversationId: 'c1', senderId: 'u1', senderType: 'internal' })).toThrow('content');
    expect(() => new SendMessageCommand({ conversationId: 'c1', senderId: 'u1', senderType: 'bot', content: 'hi' })).toThrow('invalid');
  });

  it('SendMessageCommand accepts valid data', () => {
    const cmd = new SendMessageCommand({
      conversationId: 'c1',
      senderId: 'u1',
      senderType: 'internal',
      content: 'hello',
    });
    expect(cmd.conversationId).toBe('c1');
    expect(cmd.senderType).toBe('internal');
  });

  it('AssignAgentCommand validates required fields', () => {
    expect(() => new AssignAgentCommand({})).toThrow('conversationId');
    expect(() => new AssignAgentCommand({ conversationId: 'c1' })).toThrow('agentId');
  });

  it('CloseConversationCommand validates required fields', () => {
    expect(() => new CloseConversationCommand({})).toThrow('conversationId');
  });

  it('GetConversationQuery defaults includeMessages', () => {
    const query = new GetConversationQuery({ conversationId: 'c1' });
    expect(query.includeMessages).toBe(true);
    const query2 = new GetConversationQuery({ conversationId: 'c1', includeMessages: false });
    expect(query2.includeMessages).toBe(false);
  });
});
