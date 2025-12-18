/**
 * CreateTaskCommand - 创建任务命令
 *
 * 封装任务提交所需字段并校验
 */
export class CreateTaskCommand {
  constructor(data = {}) {
    this.title = data.title?.trim();
    this.description = data.description?.trim() || '';
    this.priority = data.priority || 'medium';
    this.type = data.type || 'follow_up';
    this.assigneeId = data.assigneeId || null;
    this.assigneeName = data.assigneeName || null;
    this.conversationId = data.conversationId || null;
    this.requirementId = data.requirementId || null;
    this.dueDate = data.dueDate;

    this._validate();
  }

  _validate() {
    if (!this.title) {
      throw new Error('CreateTaskCommand: title is required');
    }
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(this.priority)) {
      throw new Error('CreateTaskCommand: invalid priority');
    }
  }
}
