import { TaskPriorityType } from '@domain/task/value-objects/TaskPriority';

export interface CreateTaskRequestDTO {
  title: string;
  description?: string;
  type?: string;
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  priority?: TaskPriorityType;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}
