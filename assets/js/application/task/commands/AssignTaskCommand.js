/**
 * AssignTaskCommand - 分配任务命令
 *
 * 表示将任务指派给具体人员
 */
export class AssignTaskCommand {
  constructor(data = {}) {
    this.taskId = data.taskId;
    this.assigneeId = data.assigneeId;
    this.assigneeName = data.assigneeName || null;
    this.reason = data.reason || null;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('AssignTaskCommand: taskId is required');
    }
    if (!this.assigneeId) {
      throw new Error('AssignTaskCommand: assigneeId is required');
    }
  }
}
