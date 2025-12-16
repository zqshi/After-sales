import { TaskResponseDTO } from './TaskResponseDTO';

export class TaskListResponseDTO {
  items: TaskResponseDTO[];
  total: number;
  page: number;
  limit: number;

  static from(items: TaskResponseDTO[], total: number, page: number, limit: number): TaskListResponseDTO {
    const dto = new TaskListResponseDTO();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
