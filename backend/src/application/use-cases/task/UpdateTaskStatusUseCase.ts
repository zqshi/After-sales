import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';
import { Validator } from '@infrastructure/validation/Validator';

import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { UpdateStatusRequestDTO, UpdateTaskStatusSchema } from '../../dto/task/UpdateStatusRequestDTO';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface UpdateTaskStatusRequest extends UpdateStatusRequestDTO {
  taskId: string;
  userId?: string;
}

const UpdateTaskStatusRequestSchema = UpdateTaskStatusSchema.extend({
  taskId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class UpdateTaskStatusUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(
    request: UpdateTaskStatusRequest,
  ): Promise<TaskResponseDTO> {
    const validatedRequest = Validator.validate(UpdateTaskStatusRequestSchema, request);

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

    if (validatedRequest.status === 'completed') {
      task.complete();
    } else if (validatedRequest.status === 'in_progress') {
      task.start();
    } else if (validatedRequest.status === 'cancelled') {
      task.cancel();
    } else {
      task.updatePriority(task.priority); // no-op
    }

    await this.taskRepository.save(task);
    return TaskResponseDTO.fromTask(task);
  }
}
