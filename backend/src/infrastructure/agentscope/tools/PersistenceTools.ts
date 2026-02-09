import { AgentCallRepository } from '@infrastructure/repositories/AgentCallRepository';
import { AgentMemoryRepository } from '@infrastructure/repositories/AgentMemoryRepository';
import { McpToolCallRepository } from '@infrastructure/repositories/McpToolCallRepository';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';
import { optionalString, requireString } from './helpers';

export function buildPersistenceTools(
  deps: AgentScopeDependencies & {
    agentCallRepository?: AgentCallRepository;
    agentMemoryRepository?: AgentMemoryRepository;
    mcpToolCallRepository?: McpToolCallRepository;
  },
): MCPToolDefinition[] {
  return [
    {
      name: 'recordAgentCall',
      description: '持久化Agent调用记录',
      parameters: {
        conversationId: { type: 'string', description: '对话ID' },
        agentName: { type: 'string', required: true },
        agentRole: { type: 'string' },
        mode: { type: 'string' },
        status: { type: 'string', required: true },
        durationMs: { type: 'number' },
        input: { type: 'object' },
        output: { type: 'object' },
        errorMessage: { type: 'string' },
        metadata: { type: 'object' },
      },
      handler: async (params) => {
        if (!deps.agentCallRepository) {
          throw new Error('AgentCallRepository not configured');
        }
        return deps.agentCallRepository.save({
          conversationId: optionalString(params.conversationId) ?? null,
          agentName: requireString(params.agentName, 'agentName'),
          agentRole: optionalString(params.agentRole),
          mode: optionalString(params.mode),
          status: requireString(params.status, 'status') as any,
          durationMs: typeof params.durationMs === 'number' ? params.durationMs : undefined,
          input: params.input && typeof params.input === 'object' ? (params.input as Record<string, unknown>) : undefined,
          output: params.output && typeof params.output === 'object' ? (params.output as Record<string, unknown>) : undefined,
          errorMessage: optionalString(params.errorMessage),
          metadata: params.metadata && typeof params.metadata === 'object' ? (params.metadata as Record<string, unknown>) : undefined,
        });
      },
    },
    {
      name: 'recordAgentMemory',
      description: '持久化Agent记忆',
      parameters: {
        conversationId: { type: 'string', required: true },
        agentName: { type: 'string', required: true },
        memory: { type: 'object', required: true },
      },
      handler: async (params) => {
        if (!deps.agentMemoryRepository) {
          throw new Error('AgentMemoryRepository not configured');
        }
        return deps.agentMemoryRepository.saveOrUpdate({
          conversationId: requireString(params.conversationId, 'conversationId'),
          agentName: requireString(params.agentName, 'agentName'),
          memory: params.memory && typeof params.memory === 'object' ? (params.memory as Record<string, unknown>) : {},
        });
      },
    },
    {
      name: 'getAgentMemory',
      description: '读取Agent记忆',
      parameters: {
        conversationId: { type: 'string', required: true },
        agentName: { type: 'string', required: true },
      },
      handler: async (params) => {
        if (!deps.agentMemoryRepository) {
          throw new Error('AgentMemoryRepository not configured');
        }
        return deps.agentMemoryRepository.findByConversation(
          requireString(params.conversationId, 'conversationId'),
          requireString(params.agentName, 'agentName'),
        );
      },
    },
  ];
}
