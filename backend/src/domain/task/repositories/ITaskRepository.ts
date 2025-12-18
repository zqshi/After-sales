import { Task } from '../models/Task';

export interface TaskFilters {
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  status?: string;
  priority?: string;
}

export interface TaskPagination {
  limit: number;
  offset: number;
}

export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findByFilters(filters: TaskFilters, pagination?: TaskPagination): Promise<Task[]>;
  countByFilters(filters: TaskFilters): Promise<number>;

  /**
   * 便捷方法：根据conversationId查找所有Task
   * 用于跨域事件协调（Task完成时检查Conversation状态）
   */
  findByConversationId(conversationId: string): Promise<Task[]>;
}
