import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { QualityScore } from '@domain/task/value-objects/QualityScore';
import { TaskEntity } from '@infrastructure/database/entities/TaskEntity';

export class TaskMapper {
  static toDomain(entity: TaskEntity): Task {
    const qualityScore = entity.qualityScore
      ? QualityScore.create({
          timeliness: entity.qualityScore,
          completeness: entity.qualityScore,
          satisfaction: entity.qualityScore,
        })
      : undefined;

    return Task.rehydrate(
      {
        title: entity.title,
        type: entity.metadata?.type as string | undefined,
        assigneeId: entity.assigneeId ?? undefined,
        conversationId: entity.conversationId ?? undefined,
        requirementId: entity.metadata?.requirementId as string | undefined,
        status: entity.status as any,
        priority: TaskPriority.create(entity.priority),
        dueDate: entity.metadata?.dueDate ? new Date(entity.metadata.dueDate as string) : undefined,
        qualityScore,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        startedAt: entity.startedAt ?? undefined,
        completedAt: entity.completedAt ?? undefined,
        metadata: entity.metadata ?? {},
      },
      entity.id,
    );
  }

  static toEntity(task: Task): TaskEntity {
    const entity = new TaskEntity();
    entity.id = task.id;
    entity.conversationId = task.metadata?.conversationId as string | null ?? task.metadata?.conversationId ?? null;
    entity.title = task.title;
    entity.description = task.metadata?.description as string | null ?? null;
    entity.assigneeId = task.assigneeId ?? null;
    entity.status = task.status;
    entity.priority = task.priority.value;
    entity.estimatedHours = task.metadata?.estimatedHours as number | null ?? null;
    entity.actualHours = task.metadata?.actualHours as number | null ?? null;
    entity.qualityScore = task.qualityScore?.overall ?? null;
    entity.startedAt = task.startedAt ?? null;
    entity.completedAt = task.completedAt ?? null;
    entity.metadata = {
      ...task.metadata,
      type: task.metadata?.type,
      requirementId: task.metadata?.requirementId,
      dueDate: task.metadata?.dueDate?.toISOString(),
    };
    entity.createdAt = task.createdAt;
    entity.updatedAt = task.updatedAt;
    return entity;
  }
}
