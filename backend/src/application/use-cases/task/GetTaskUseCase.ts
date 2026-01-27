import { z } from 'zod';

import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';
import { Validator } from '@infrastructure/validation/Validator';

import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface GetTaskRequest {
  taskId: string;
  userId?: string;
}

const GetTaskRequestSchema = z.object({
  taskId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class GetTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(request: GetTaskRequest): Promise<TaskResponseDTO> {
    const validatedRequest = Validator.validate(GetTaskRequestSchema, request);

    if (validatedRequest.userId && this.accessControl) {
      await this.accessControl.checkTaskAccess(
        validatedRequest.userId,
        validatedRequest.taskId,
        'read',
      );
    }

    const task = await this.taskRepository.findById(validatedRequest.taskId);
    if (!task) {
      throw new Error(`Task not found: ${validatedRequest.taskId}`);
    }

    return TaskResponseDTO.fromTask(task);
  }
}
