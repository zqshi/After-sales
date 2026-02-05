import { describe, it, expect } from 'vitest';
import { CreateTaskCommand } from '../commands/CreateTaskCommand.js';
import { AssignTaskCommand } from '../commands/AssignTaskCommand.js';
import { UpdateTaskStatusCommand } from '../commands/UpdateTaskStatusCommand.js';
import { CompleteTaskCommand } from '../commands/CompleteTaskCommand.js';
import { GetTaskQuery } from '../queries/GetTaskQuery.js';
import { ListTasksQuery } from '../queries/ListTasksQuery.js';


describe('Task commands and queries', () => {
  it('CreateTaskCommand validates title and priority', () => {
    expect(() => new CreateTaskCommand({})).toThrow('title');
    expect(() => new CreateTaskCommand({ title: 't', priority: 'invalid' })).toThrow('priority');
  });

  it('AssignTaskCommand validates required fields', () => {
    expect(() => new AssignTaskCommand({})).toThrow('taskId');
    expect(() => new AssignTaskCommand({ taskId: 't1' })).toThrow('assigneeId');
  });

  it('UpdateTaskStatusCommand validates status', () => {
    expect(() => new UpdateTaskStatusCommand({ taskId: 't1' })).toThrow('status');
    expect(() => new UpdateTaskStatusCommand({ taskId: 't1', status: 'done' })).toThrow('invalid');
  });

  it('CompleteTaskCommand validates required fields', () => {
    expect(() => new CompleteTaskCommand({})).toThrow('taskId');
    expect(() => new CompleteTaskCommand({ taskId: 't1' })).toThrow('completedBy');
  });

  it('Task queries default values', () => {
    const get = new GetTaskQuery({ taskId: 't1' });
    expect(get.taskId).toBe('t1');

    const list = new ListTasksQuery({});
    expect(list.status).toBe('all');
    expect(list.priority).toBe('all');
  });
});
