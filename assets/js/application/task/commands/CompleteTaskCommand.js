/**
 * CompleteTaskCommand - 完成任务命令
 *
 * 包含质量评分与结案人
 */
export class CompleteTaskCommand {
  constructor(data = {}) {
    this.taskId = data.taskId;
    this.completedBy = data.completedBy;
    this.completionNotes = data.completionNotes || '';
    this.actualHours = data.actualHours;
    this.qualityScore = data.qualityScore;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('CompleteTaskCommand: taskId is required');
    }
    if (!this.completedBy) {
      throw new Error('CompleteTaskCommand: completedBy is required');
    }
  }
}
