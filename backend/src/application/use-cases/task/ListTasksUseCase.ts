import { TaskRepository } from '@infrastructure/repositories/TaskRepository';

import { TaskListQueryDTO } from '../../dto/task/TaskListQueryDTO';
import { TaskListResponseDTO } from '../../dto/task/TaskListResponseDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export class ListTasksUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  private normalizePage(page?: number): number {
    return page && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(limit), 100);
  }

  async execute(request: TaskListQueryDTO): Promise<TaskListResponseDTO> {
    const page = this.normalizePage(request.page);
    const limit = this.normalizeLimit(request.limit);
    const offset = (page - 1) * limit;

    const filters = {
      assigneeId: request.assigneeId,
      conversationId: request.conversationId,
      requirementId: request.requirementId,
      status: request.status,
      priority: request.priority,
    };

    const [tasks, total] = await Promise.all([
      this.taskRepository.findByFilters(filters, { limit, offset }),
      this.taskRepository.countByFilters(filters),
    ]);

    const dtos = tasks.map((task) => TaskResponseDTO.fromTask(task));

    return TaskListResponseDTO.from(dtos, total, page, limit);
  }
}
