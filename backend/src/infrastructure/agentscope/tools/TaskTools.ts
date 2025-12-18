import { optionalString, requireString } from './helpers';
import { AgentScopeDependencies, MCPToolDefinition } from '../types';
import { UpdateStatusRequestDTO } from '@application/dto/task/UpdateStatusRequestDTO';

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
        return deps.updateTaskStatusUseCase.execute(
          requireString(params.taskId, 'taskId'),
          { status },
        );
      },
    },
  ];
}
