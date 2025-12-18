/**
 * TaskApplicationService - 任务应用服务
 *
 * 负责调度 Task 聚合根与 API 仓储、发布领域事件
 */
import { Task } from '../../domains/task/models/Task.js';

export class TaskApplicationService {
  constructor({ taskRepository, eventBus }) {
    this.taskRepository = taskRepository;
    this.eventBus = eventBus;
  }

  async createTask(command) {
    const payload = {
      title: command.title,
      description: command.description,
      priority: command.priority,
      type: command.type,
      assigneeId: command.assigneeId,
      assigneeName: command.assigneeName,
      conversationId: command.conversationId,
      requirementId: command.requirementId,
      dueDate: command.dueDate,
    };

    const result = await this.taskRepository.create(payload);
    return result;
  }

  async assignTask(command) {
    const task = await this._loadTask(command.taskId);
    task.reassign(command.assigneeId, command.assigneeName, command.reason);
    const result = await this.taskRepository.assign(command.taskId, {
      assigneeId: command.assigneeId,
      assigneeName: command.assigneeName,
      reason: command.reason,
    });
    await this._publishEvents(task);
    return result;
  }

  async updateTaskStatus(command) {
    const task = await this._loadTask(command.taskId);
    switch (command.status) {
      case 'in_progress':
        task.start();
        break;
      case 'completed':
        task.complete('system');
        break;
      case 'cancelled':
        task.cancel(command.reason || 'Cancelled via UI');
        break;
      default:
        break;
    }

    const payload = { status: command.status };
    if (command.reason) {
      payload.reason = command.reason;
    }
    const result = await this.taskRepository.updateStatus(command.taskId, payload);
    await this._publishEvents(task);
    return result;
  }

  async completeTask(command) {
    const task = await this._loadTask(command.taskId);
    task.complete(command.completedBy, {
      actualHours: command.actualHours,
      completionNotes: command.completionNotes,
      quality: command.qualityScore,
    });
    const result = await this.taskRepository.complete(command.taskId, {
      completedBy: command.completedBy,
      completionNotes: command.completionNotes,
      actualHours: command.actualHours,
      qualityScore: command.qualityScore,
    });
    await this._publishEvents(task);
    return result;
  }

  async getTask(query) {
    return this.taskRepository.findById(query.taskId);
  }

  async listTasks(query) {
    return this.taskRepository.list({
      assigneeId: query.assigneeId,
      status: query.status === 'all' ? undefined : query.status,
      priority: query.priority === 'all' ? undefined : query.priority,
      page: query.page,
      limit: query.limit,
    });
  }

  async _loadTask(taskId) {
    const data = await this.taskRepository.findById(taskId);
    if (!data) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return new Task(data);
  }

  async _publishEvents(task) {
    const events = task.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    task.clearDomainEvents();
  }
}
