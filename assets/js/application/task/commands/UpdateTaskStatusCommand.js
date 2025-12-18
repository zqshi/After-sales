/**
 * UpdateTaskStatusCommand - 更新任务状态命令
 *
 * 支持 pending/in_progress/completed/cancelled
 */
export class UpdateTaskStatusCommand {
  constructor(data = {}) {
    this.taskId = data.taskId;
    this.status = data.status;
    this.reason = data.reason || null;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('UpdateTaskStatusCommand: taskId is required');
    }
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(this.status)) {
      throw new Error('UpdateTaskStatusCommand: invalid status');
    }
  }
}
