import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { CompleteTaskRequestDTO } from '../../dto/task/CompleteTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { QualityScore } from '@domain/task/value-objects/QualityScore';

export class CompleteTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(taskId: string, request: CompleteTaskRequestDTO): Promise<TaskResponseDTO> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const qualityScore = request.qualityScore
      ? QualityScore.create(request.qualityScore)
      : undefined;

    task.complete(qualityScore);
    await this.taskRepository.save(task);
    return TaskResponseDTO.fromTask(task);
  }
}
