import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { UpdateStatusRequestDTO } from '../../dto/task/UpdateStatusRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';

export class UpdateTaskStatusUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(
    taskId: string,
    payload: UpdateStatusRequestDTO,
  ): Promise<TaskResponseDTO> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (payload.status === 'completed') {
      task.complete();
    } else if (payload.status === 'in_progress') {
      task.start();
    } else if (payload.status === 'cancelled') {
      task.cancel();
    } else {
      task.updatePriority(task.priority); // no-op
    }

    await this.taskRepository.save(task);
    return TaskResponseDTO.fromTask(task);
  }
}
