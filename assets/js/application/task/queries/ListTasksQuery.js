/**
 * ListTasksQuery - 查询任务集合
 */
export class ListTasksQuery {
  constructor(data = {}) {
    this.assigneeId = data.assigneeId || null;
    this.status = data.status || 'all';
    this.priority = data.priority || 'all';
    const pageValue = Number.parseInt(data.page, 10);
    const limitValue = Number.parseInt(data.limit, 10);
    this.page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    this.limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
  }
}
