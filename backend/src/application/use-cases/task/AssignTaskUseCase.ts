import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { AssignTaskRequestDTO } from '../../dto/task/AssignTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';

export class AssignTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(request: AssignTaskRequestDTO): Promise<TaskResponseDTO> {
    if (!request.taskId || !request.assigneeId) {
      throw new Error('taskId and assigneeId are required');
    }

    const task = await this.taskRepository.findById(request.taskId);
    if (!task) {
      throw new Error(`Task not found: ${request.taskId}`);
    }

    task.reassign(request.assigneeId);
    await this.taskRepository.save(task);

    return TaskResponseDTO.fromTask(task);
  }
}
