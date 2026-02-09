/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { isImChannel } from '@domain/conversation/constants';

import { AgentScopeDependencies, MCPToolDefinition } from '../types';

import { optionalString, requireString } from './helpers';

const includeMessagesFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() !== 'false';
  }
  return true;
};

export function buildConversationTools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'createConversation',
      description: '创建新的对话',
      parameters: {
        customerId: { type: 'string', required: true, description: '客户ID' },
        channel: { type: 'string', required: true, description: '渠道类型' },
        agentId: { type: 'string', description: '指定接待的坐席' },
        priority: { type: 'string', description: '优先级 low|normal|high' },
        slaDeadline: { type: 'string', description: '客户等级截止时间 ISO 格式' },
        metadata: { type: 'object', description: '附加元数据' },
        initialMessage: { type: 'object', description: '初始消息内容' },
      },
      handler: async (params) => {
        const initialMessage = params.initialMessage && typeof params.initialMessage === 'object'
          ? params.initialMessage as Record<string, unknown>
          : undefined;

        const request = {
          customerId: requireString(params.customerId, 'customerId'),
          channel: requireString(params.channel, 'channel'),
          agentId: optionalString(params.agentId),
          priority: optionalString(params.priority) as 'low' | 'normal' | 'high' | undefined,
          slaDeadline: optionalString(params.slaDeadline),
          metadata: params.metadata && typeof params.metadata === 'object' ? (params.metadata as Record<string, unknown>) : undefined,
          initialMessage: initialMessage
            ? {
                senderId: requireString(initialMessage.senderId, 'initialMessage.senderId'),
                senderType: optionalString(initialMessage.senderType) as 'internal' | 'external' | undefined,
                content: requireString(initialMessage.content, 'initialMessage.content'),
                metadata: initialMessage.metadata && typeof initialMessage.metadata === 'object'
                  ? (initialMessage.metadata as Record<string, unknown>)
                  : undefined,
              }
            : undefined,
        };

        return deps.createConversationUseCase.execute(request);
      },
    },
    {
      name: 'sendMessage',
      description: '发送消息到对话',
      parameters: {
        conversationId: { type: 'string', required: true },
        senderId: { type: 'string', required: true },
        senderType: { type: 'string', required: true },
        content: { type: 'string', required: true },
        metadata: { type: 'object', description: '消息元数据' },
      },
      handler: async (params) => {
        return deps.sendMessageUseCase.execute({
          conversationId: requireString(params.conversationId, 'conversationId'),
          senderId: requireString(params.senderId, 'senderId'),
          senderType: requireString(params.senderType, 'senderType') as 'internal' | 'external',
          content: requireString(params.content, 'content'),
          metadata: params.metadata && typeof params.metadata === 'object'
            ? (params.metadata as Record<string, unknown>)
            : undefined,
        });
      },
    },
    {
      name: 'getConversation',
      description: '获取对话详情',
      parameters: {
        conversationId: { type: 'string', required: true },
        includeMessages: { type: 'boolean' },
      },
      handler: async (params) => {
        return deps.getConversationUseCase.execute({
          conversationId: requireString(params.conversationId, 'conversationId'),
          includeMessages: includeMessagesFlag(params.includeMessages),
        });
      },
    },
    {
      name: 'getConversationHistory',
      description: '获取对话历史消息',
      parameters: {
        conversationId: { type: 'string', required: true },
        includeMetadata: { type: 'boolean' },
        limit: { type: 'number' },
      },
      handler: async (params) => {
        const conversationId = requireString(params.conversationId, 'conversationId');
        const includeMetadata = includeMessagesFlag(params.includeMetadata);
        const limit = typeof params.limit === 'number' && params.limit > 0 ? Math.floor(params.limit) : undefined;
        const conversation = await deps.conversationRepository.findById(conversationId);
        if (!conversation) {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
        const messages = limit ? conversation.messages.slice(-limit) : conversation.messages;
        return messages.map((msg) => ({
          role: msg.senderType === 'customer' ? 'customer' : 'agent',
          senderId: msg.senderId,
          senderType: msg.senderType,
          content: msg.content,
          timestamp: msg.sentAt.toISOString(),
          ...(includeMetadata ? { metadata: msg.metadata ?? {} } : {}),
        }));
      },
    },
    {
      name: 'getConversationContext',
      description: '获取对话上下文（元信息 + 最近消息）',
      parameters: {
        conversationId: { type: 'string', required: true },
        limit: { type: 'number' },
      },
      handler: async (params) => {
        const conversationId = requireString(params.conversationId, 'conversationId');
        const limit = typeof params.limit === 'number' && params.limit > 0 ? Math.floor(params.limit) : 10;
        const conversation = await deps.conversationRepository.findById(conversationId);
        if (!conversation) {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
        const messages = conversation.messages.slice(-limit).map((msg) => ({
          role: msg.senderType === 'customer' ? 'customer' : 'agent',
          senderId: msg.senderId,
          senderType: msg.senderType,
          content: msg.content,
          timestamp: msg.sentAt.toISOString(),
        }));
        return {
          conversation: {
            id: conversation.id,
            customerId: conversation.customerId,
            status: conversation.status,
            channel: conversation.channel,
            priority: conversation.priority,
          },
          messages,
        };
      },
    },
    {
      name: 'closeConversation',
      description: '关闭对话（注意：IM渠道不支持关闭对话操作）',
      parameters: {
        conversationId: { type: 'string', required: true },
        closedBy: { type: 'string', required: true },
        reason: { type: 'string' },
      },
      handler: async (params) => {
        const conversationId = requireString(params.conversationId, 'conversationId');

        // 检查是否为IM渠道
        const conversation = await deps.conversationRepository.findById(conversationId);
        if (conversation && isImChannel(conversation.channel.value)) {
          return {
            success: false,
            error: 'IM渠道不支持关闭对话操作。IM对话永久存在，通过问题生命周期管理来驱动业务流程。',
            channel: conversation.channel.value,
            suggestion: '请使用问题状态管理（updateProblemStatus）来标记问题已解决，系统会自动触发质检。',
          };
        }

        // 非IM渠道（如工单系统）可以关闭
        return deps.closeConversationUseCase.execute({
          conversationId,
          closedBy: requireString(params.closedBy, 'closedBy'),
          reason: optionalString(params.reason),
        });
      },
    },
  ];
}
