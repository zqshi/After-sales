import { Task } from '@domain/task/models/Task';

export class TaskResponseDTO {
  id: string;
  title: string;
  type?: string;
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  status: string;
  priority: string;
  dueDate?: string;
  qualityScore?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;

  static fromTask(task: Task): TaskResponseDTO {
    const dto = new TaskResponseDTO();
    dto.id = task.id;
    dto.title = task.title;
    dto.type = task.type;
    dto.assigneeId = task.assigneeId;
    dto.conversationId = task.conversationId;
    dto.requirementId = task.requirementId;
    dto.status = task.status;
    dto.priority = task.priority.value;
    dto.dueDate = task.dueDate?.toISOString();
    dto.qualityScore = task.qualityScore?.overall;
    dto.startedAt = task.startedAt?.toISOString();
    dto.completedAt = task.completedAt?.toISOString();
    dto.createdAt = task.createdAt.toISOString();
    dto.updatedAt = task.updatedAt.toISOString();
    dto.metadata = task.metadata;
    return dto;
  }
}
