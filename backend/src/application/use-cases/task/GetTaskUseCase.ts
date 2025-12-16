import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';

export interface GetTaskRequest {
  taskId: string;
}

export class GetTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(request: GetTaskRequest): Promise<TaskResponseDTO> {
    if (!request.taskId) {
      throw new Error('taskId is required');
    }
    const task = await this.taskRepository.findById(request.taskId);
    if (!task) {
      throw new Error(`Task not found: ${request.taskId}`);
    }

    return TaskResponseDTO.fromTask(task);
  }
}
