import { QualityScore } from '@domain/task/value-objects/QualityScore';
import { EventBus } from '@infrastructure/events/EventBus';
import { shouldPublishDirectly } from '@infrastructure/events/outboxPolicy';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { nonEmptyStringSchema, uuidSchema } from '@infrastructure/validation/CommonSchemas';
import { Validator } from '@infrastructure/validation/Validator';

import { CompleteTaskRequestDTO, CompleteTaskRequestSchema } from '../../dto/task/CompleteTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { ResourceAccessControl } from '../../services/ResourceAccessControl';

export interface CompleteTaskRequest extends CompleteTaskRequestDTO {
  taskId: string;
  userId?: string;
}

const CompleteTaskRequestSchemaWithId = CompleteTaskRequestSchema.extend({
  taskId: uuidSchema.or(nonEmptyStringSchema.max(100)),
  userId: uuidSchema.or(nonEmptyStringSchema.max(100)).optional(),
});

export class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventBus: EventBus,
    private readonly accessControl?: ResourceAccessControl,
  ) {}

  async execute(request: CompleteTaskRequest): Promise<TaskResponseDTO> {
    const validatedRequest = Validator.validate(CompleteTaskRequestSchemaWithId, request);

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

    const qualityScore = validatedRequest.qualityScore
      ? QualityScore.create(validatedRequest.qualityScore)
      : undefined;

    // 执行领域逻辑
    task.complete(qualityScore);

    // 获取未提交的事件
    const events = task.getUncommittedEvents();

    // 保存聚合根
    await this.taskRepository.save(task);

    // 发布领域事件
    if (shouldPublishDirectly()) {
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      task.clearEvents();
    }

    return TaskResponseDTO.fromTask(task);
  }
}
