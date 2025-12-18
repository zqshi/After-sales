/**
 * TaskController - 任务表现层控制器
 *
 * 负责 UI 和应用服务之间的协调
 */
import { getContainer } from '../../application/container/bootstrap.js';
import { CreateTaskCommand } from '../../application/task/commands/CreateTaskCommand.js';
import { AssignTaskCommand } from '../../application/task/commands/AssignTaskCommand.js';
import { UpdateTaskStatusCommand } from '../../application/task/commands/UpdateTaskStatusCommand.js';
import { CompleteTaskCommand } from '../../application/task/commands/CompleteTaskCommand.js';
import { GetTaskQuery } from '../../application/task/queries/GetTaskQuery.js';
import { ListTasksQuery } from '../../application/task/queries/ListTasksQuery.js';

export class TaskController {
  constructor() {
    const container = getContainer();
    this.taskService = container.resolve('taskApplicationService');
  }

  async createTask(data) {
    const command = new CreateTaskCommand(data);
    return this.taskService.createTask(command);
  }

  async assignTask(data) {
    const command = new AssignTaskCommand(data);
    return this.taskService.assignTask(command);
  }

  async updateStatus(data) {
    const command = new UpdateTaskStatusCommand(data);
    return this.taskService.updateTaskStatus(command);
  }

  async completeTask(data) {
    const command = new CompleteTaskCommand(data);
    return this.taskService.completeTask(command);
  }

  async getTask(taskId) {
    const query = new GetTaskQuery({ taskId });
    return this.taskService.getTask(query);
  }

  async listTasks(filters = {}) {
    const query = new ListTasksQuery(filters);
    return this.taskService.listTasks(query);
  }
}

export const taskController = new TaskController();
