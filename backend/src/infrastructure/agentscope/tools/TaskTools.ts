import { UpdateStatusRequestDTO } from '@application/dto/task/UpdateStatusRequestDTO';

import { AgentScopeDependencies, MCPToolDefinition } from '../types';

import { optionalNumber, optionalString, requireString } from './helpers';

export function buildTaskTools(deps: AgentScopeDependencies): MCPToolDefinition[] {
  return [
    {
      name: 'createTask',
      description: '创建任务',
      parameters: {
        title: { type: 'string', required: true },
        type: { type: 'string' },
        assigneeId: { type: 'string' },
        conversationId: { type: 'string' },
        requirementId: { type: 'string' },
        priority: { type: 'string' },
        dueDate: { type: 'string' },
        metadata: { type: 'object' },
      },
      handler: async (params) => {
        return deps.createTaskUseCase.execute({
          title: requireString(params.title, 'title'),
          type: optionalString(params.type),
          assigneeId: optionalString(params.assigneeId),
          conversationId: optionalString(params.conversationId),
          requirementId: optionalString(params.requirementId),
          priority: optionalString(params.priority) as 'low' | 'medium' | 'high' | undefined,
          dueDate: optionalString(params.dueDate),
          metadata: params.metadata && typeof params.metadata === 'object'
            ? (params.metadata as Record<string, unknown>)
            : undefined,
        });
      },
    },
    {
      name: 'updateTaskStatus',
      description: '更新任务状态',
      parameters: {
        taskId: { type: 'string', required: true },
        status: { type: 'string', required: true },
      },
      handler: async (params) => {
        const status = requireString(params.status, 'status') as UpdateStatusRequestDTO['status'];
        return deps.updateTaskStatusUseCase.execute({
          taskId: requireString(params.taskId, 'taskId'),
          status,
        });
      },
    },
    {
      name: 'searchTickets',
      description: '检索历史工单',
      parameters: {
        query: { type: 'string', required: true },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      handler: async (params) => {
        const query = requireString(params.query, 'query');
        const limit = optionalNumber(params.limit);
        const offset = optionalNumber(params.offset);
        const results = await deps.taskRepository.searchByQuery(query, { limit, offset });
        return results.map((task) => ({
          ticket_id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          resolution: task.metadata?.resolution ?? null,
          time_spent: task.metadata?.timeSpent ?? null,
          updated_at: task.updatedAt?.toISOString?.() ?? null,
        }));
      },
    },
    {
      name: 'createTechnicalTicket',
      description: '创建技术工单',
      parameters: {
        title: { type: 'string', required: true },
        conversationId: { type: 'string' },
        priority: { type: 'string' },
        metadata: { type: 'object' },
      },
      handler: async (params) => {
        return deps.createTaskUseCase.execute({
          title: requireString(params.title, 'title'),
          type: 'technical',
          conversationId: optionalString(params.conversationId),
          priority: optionalString(params.priority) as 'low' | 'medium' | 'high' | undefined,
          metadata: params.metadata && typeof params.metadata === 'object'
            ? (params.metadata as Record<string, unknown>)
            : undefined,
        });
      },
    },
  ];
}
