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
}
