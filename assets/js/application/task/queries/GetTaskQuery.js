/**
 * GetTaskQuery - 查询单个任务
 */
export class GetTaskQuery {
  constructor(data = {}) {
    this.taskId = data.taskId;

    this._validate();
  }

  _validate() {
    if (!this.taskId) {
      throw new Error('GetTaskQuery: taskId is required');
    }
  }
}
