import { optionalString, requireString } from './helpers';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';

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
        slaDeadline: { type: 'string', description: 'SLA截止时间 ISO 格式' },
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
      },
      handler: async (params) => {
        return deps.sendMessageUseCase.execute({
          conversationId: requireString(params.conversationId, 'conversationId'),
          senderId: requireString(params.senderId, 'senderId'),
          senderType: requireString(params.senderType, 'senderType') as 'internal' | 'external',
          content: requireString(params.content, 'content'),
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
      name: 'closeConversation',
      description: '关闭对话',
      parameters: {
        conversationId: { type: 'string', required: true },
        closedBy: { type: 'string', required: true },
        reason: { type: 'string' },
      },
      handler: async (params) => {
        return deps.closeConversationUseCase.execute({
          conversationId: requireString(params.conversationId, 'conversationId'),
          closedBy: requireString(params.closedBy, 'closedBy'),
          reason: optionalString(params.reason),
        });
      },
    },
  ];
}
