import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { Validator } from '@infrastructure/validation/Validator';

import { AssignTaskRequestDTO, AssignTaskRequestSchema } from '../../dto/task/AssignTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface AssignTaskRequest extends AssignTaskRequestDTO {
  userId?: string;
}

export class AssignTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(request: AssignTaskRequest): Promise<TaskResponseDTO> {
    const validatedRequest = Validator.validate(AssignTaskRequestSchema, request) as AssignTaskRequest;

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkTaskAccess(
        validatedRequest.userId,
        validatedRequest.taskId,
        'write',
      );
    }

    const task = await this.taskRepository.findById(validatedRequest.taskId);
    if (!task) {
      throw new Error(`Task not found: ${validatedRequest.taskId}`);
    }

    task.reassign(validatedRequest.assigneeId);
    await this.taskRepository.save(task);

    return TaskResponseDTO.fromTask(task);
  }
}
