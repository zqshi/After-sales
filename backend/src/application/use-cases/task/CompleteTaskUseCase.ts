import { TaskRepository } from '@infrastructure/repositories/TaskRepository';
import { CompleteTaskRequestDTO } from '../../dto/task/CompleteTaskRequestDTO';
import { TaskResponseDTO } from '../../dto/task/TaskResponseDTO';
import { QualityScore } from '@domain/task/value-objects/QualityScore';
import { EventBus } from '@infrastructure/events/EventBus';

export class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(taskId: string, request: CompleteTaskRequestDTO): Promise<TaskResponseDTO> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const qualityScore = request.qualityScore
      ? QualityScore.create(request.qualityScore)
      : undefined;

    // 执行领域逻辑
    task.complete(qualityScore);

    // 获取未提交的事件
    const events = task.getUncommittedEvents();

    // 保存聚合根
    await this.taskRepository.save(task);

    // 发布领域事件
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    task.clearEvents();

    return TaskResponseDTO.fromTask(task);
  }
}
