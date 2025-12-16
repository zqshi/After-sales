import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { CreateTaskRequestDTO } from '../../dto/task/CreateTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';

export class CreateTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(request: CreateTaskRequestDTO): Promise<TaskResponseDTO> {
    if (!request.title) {
      throw new Error('title is required');
    }

    const priority = request.priority
      ? TaskPriority.create(request.priority)
      : TaskPriority.create('medium');

    const dueDate = request.dueDate ? new Date(request.dueDate) : undefined;

    const task = Task.create({
      title: request.title,
      type: request.type,
      assigneeId: request.assigneeId,
      conversationId: request.conversationId,
      requirementId: request.requirementId,
      priority,
      dueDate,
      metadata: request.metadata,
    });

    await this.taskRepository.save(task);
    return TaskResponseDTO.fromTask(task);
  }
}
