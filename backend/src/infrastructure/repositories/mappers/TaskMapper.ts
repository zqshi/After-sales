import { Task } from '@domain/task/models/Task';
import { QualityScore } from '@domain/task/value-objects/QualityScore';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
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
        status: entity.status as Task['status'],
        priority: TaskPriority.create(entity.priority),
        dueDate:
          entity.metadata?.dueDate && typeof entity.metadata.dueDate === 'string'
            ? new Date(entity.metadata.dueDate)
            : undefined,
        qualityScore,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        startedAt: entity.startedAt ?? undefined,
        completedAt: entity.completedAt ?? undefined,
        metadata: entity.metadata ?? {},
      },
      entity.id,
      entity.version,
    );
  }

  static toEntity(task: Task): TaskEntity {
    const entity = new TaskEntity();
    entity.id = task.id;
    const conversationId =
      task.conversationId ??
      (typeof task.metadata?.conversationId === 'string' ? task.metadata.conversationId : null);
    entity.conversationId = conversationId ?? null;
    entity.title = task.title;
    const description =
      typeof task.metadata?.description === 'string' ? task.metadata.description : null;
    entity.description = description;
    entity.assigneeId = task.assigneeId ?? null;
    entity.status = task.status;
    entity.priority = task.priority.value;
    entity.estimatedHours = task.metadata?.estimatedHours as number | null ?? null;
    entity.actualHours = task.metadata?.actualHours as number | null ?? null;
    entity.qualityScore = task.qualityScore?.overall ?? null;
    entity.startedAt = task.startedAt ?? null;
    entity.completedAt = task.completedAt ?? null;
    const dueDateValue = task.metadata?.dueDate;
    const dueDateIso =
      dueDateValue instanceof Date
        ? dueDateValue.toISOString()
        : typeof dueDateValue === 'string'
        ? dueDateValue
        : undefined;
    const requirementId =
      task.requirementId ??
      (typeof task.metadata?.requirementId === 'string' ? task.metadata.requirementId : undefined);
    entity.metadata = {
      ...task.metadata,
      type: task.metadata?.type,
      requirementId,
      dueDate: dueDateIso,
    };
    entity.version = task.version;
    entity.createdAt = task.createdAt;
    entity.updatedAt = task.updatedAt;
    return entity;
  }
}
