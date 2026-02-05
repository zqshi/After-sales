import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateTaskCommand } from '../../application/task/commands/CreateTaskCommand.js';
import { AssignTaskCommand } from '../../application/task/commands/AssignTaskCommand.js';
import { UpdateTaskStatusCommand } from '../../application/task/commands/UpdateTaskStatusCommand.js';
import { CompleteTaskCommand } from '../../application/task/commands/CompleteTaskCommand.js';
import { GetTaskQuery } from '../../application/task/queries/GetTaskQuery.js';
import { ListTasksQuery } from '../../application/task/queries/ListTasksQuery.js';
import { SendMessageCommand } from '../../application/conversation/commands/SendMessageCommand.js';
import { CloseConversationCommand } from '../../application/conversation/commands/CloseConversationCommand.js';
import { AssignAgentCommand } from '../../application/conversation/commands/AssignAgentCommand.js';
import { GetConversationQuery } from '../../application/conversation/queries/GetConversationQuery.js';
import { RefreshProfileCommand } from '../../application/customer/commands/RefreshProfileCommand.js';
import { AddServiceRecordCommand } from '../../application/customer/commands/AddServiceRecordCommand.js';
import { GetProfileQuery } from '../../application/customer/queries/GetProfileQuery.js';
import { CreateRequirementCommand } from '../../application/requirement/commands/CreateRequirementCommand.js';
import { GetRequirementListQuery } from '../../application/requirement/queries/GetRequirementListQuery.js';

let services = {};

vi.mock('../../application/container/bootstrap.js', () => ({
  getContainer: () => ({
    resolve: (name) => services[name],
  }),
}));

describe('presentation controllers', () => {
  let taskService;
  let conversationService;
  let profileService;
  let requirementService;
  let knowledgeService;

  beforeEach(() => {
    vi.resetModules();
    taskService = {
      createTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
      assignTask: vi.fn().mockResolvedValue({ ok: true }),
      updateTaskStatus: vi.fn().mockResolvedValue({ ok: true }),
      completeTask: vi.fn().mockResolvedValue({ ok: true }),
      getTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
      listTasks: vi.fn().mockResolvedValue({ items: [] }),
    };
    conversationService = {
      sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
      closeConversation: vi.fn().mockResolvedValue({ ok: true }),
      assignAgent: vi.fn().mockResolvedValue({ ok: true }),
      getConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
      getConversationList: vi.fn().mockResolvedValue([]),
    };
    profileService = {
      refreshProfile: vi.fn().mockResolvedValue({ ok: true }),
      addServiceRecord: vi.fn().mockResolvedValue({ ok: true }),
      updateCommitmentProgress: vi.fn().mockResolvedValue({ ok: true }),
      addInteraction: vi.fn().mockResolvedValue({ ok: true }),
      markAsVIP: vi.fn().mockResolvedValue({ ok: true }),
      getProfile: vi.fn().mockResolvedValue({ id: 'cust-1' }),
    };
    requirementService = {
      createRequirement: vi.fn().mockResolvedValue({ id: 'req-1' }),
      updateRequirementStatus: vi.fn().mockResolvedValue({ ok: true }),
      getRequirementList: vi.fn().mockResolvedValue({ items: [] }),
      getRequirement: vi.fn().mockResolvedValue({ id: 'req-1' }),
    };
    knowledgeService = {
      listKnowledge: vi.fn().mockResolvedValue([{ id: 'k1' }]),
      getKnowledgeDetail: vi.fn().mockResolvedValue({ id: 'k1' }),
      recommendKnowledge: vi.fn().mockResolvedValue([{ id: 'k2' }]),
    };

    services = {
      taskApplicationService: taskService,
      conversationApplicationService: conversationService,
      customerProfileApplicationService: profileService,
      requirementApplicationService: requirementService,
      knowledgeApplicationService: knowledgeService,
    };
  });

  it('builds task commands and queries', async () => {
    const { TaskController } = await import('../task/TaskController.js');
    const controller = new TaskController();

    await controller.createTask({ title: ' 任务一 ', description: 'desc', priority: 'high' });
    const createCommand = taskService.createTask.mock.calls[0][0];
    expect(createCommand.constructor.name).toBe(CreateTaskCommand.name);
    expect(createCommand.title).toBe('任务一');

    await controller.assignTask({ taskId: 'task-1', assigneeId: 'u1' });
    const assignCommand = taskService.assignTask.mock.calls[0][0];
    expect(assignCommand.constructor.name).toBe(AssignTaskCommand.name);

    await controller.updateStatus({ taskId: 'task-1', status: 'in_progress' });
    const updateCommand = taskService.updateTaskStatus.mock.calls[0][0];
    expect(updateCommand.constructor.name).toBe(UpdateTaskStatusCommand.name);

    await controller.completeTask({ taskId: 'task-1', summary: 'done', completedBy: 'agent' });
    const completeCommand = taskService.completeTask.mock.calls[0][0];
    expect(completeCommand.constructor.name).toBe(CompleteTaskCommand.name);

    await controller.getTask('task-1');
    const getQuery = taskService.getTask.mock.calls[0][0];
    expect(getQuery.constructor.name).toBe(GetTaskQuery.name);
    expect(getQuery.taskId).toBe('task-1');

    await controller.listTasks({ page: '2', limit: '5', status: 'open' });
    const listQuery = taskService.listTasks.mock.calls[0][0];
    expect(listQuery.constructor.name).toBe(ListTasksQuery.name);
    expect(listQuery.page).toBe(2);
    expect(listQuery.limit).toBe(5);
  });

  it('creates conversation commands and handles errors', async () => {
    const { ConversationController } = await import('../conversation/ConversationController.js');
    const controller = new ConversationController();

    await controller.sendMessage({
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderType: 'internal',
      content: 'hello',
    });
    const sendCommand = conversationService.sendMessage.mock.calls[0][0];
    expect(sendCommand.constructor.name).toBe(SendMessageCommand.name);
    expect(sendCommand.content).toBe('hello');

    await controller.closeConversation({ conversationId: 'conv-1', closedBy: 'agent', reason: 'done' });
    const closeCommand = conversationService.closeConversation.mock.calls[0][0];
    expect(closeCommand.constructor.name).toBe(CloseConversationCommand.name);

    await controller.assignAgent({ conversationId: 'conv-1', agentId: 'agent-1', agentName: 'A1' });
    const assignCommand = conversationService.assignAgent.mock.calls[0][0];
    expect(assignCommand.constructor.name).toBe(AssignAgentCommand.name);

    await controller.getConversation({ conversationId: 'conv-1', includeMessages: false });
    const getQuery = conversationService.getConversation.mock.calls[0][0];
    expect(getQuery.constructor.name).toBe(GetConversationQuery.name);

    await controller.getConversationList({ status: 'open' });
    expect(conversationService.getConversationList).toHaveBeenCalledWith({ status: 'open' });

    const error = new Error('close failed');
    conversationService.closeConversation.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(controller.closeConversation({ conversationId: 'conv-1' })).rejects.toThrow('close failed');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('builds customer profile commands and queries', async () => {
    const { CustomerProfileController } = await import('../customer/CustomerProfileController.js');
    const controller = new CustomerProfileController();

    await controller.refreshProfile({ customerId: 'cust-1', profileData: { name: 'a' }, triggeredBy: 'agent' });
    const refreshCommand = profileService.refreshProfile.mock.calls[0][0];
    expect(refreshCommand.constructor.name).toBe(RefreshProfileCommand.name);
    expect(refreshCommand.customerId).toBe('cust-1');

    await controller.addServiceRecord({ customerId: 'cust-1', title: '记录', status: '进行中', owner: 'agent' });
    const serviceCommand = profileService.addServiceRecord.mock.calls[0][0];
    expect(serviceCommand.constructor.name).toBe(AddServiceRecordCommand.name);

    await controller.updateCommitmentProgress({ customerId: 'cust-1', commitmentId: 'c1', progress: 0.6 });
    expect(profileService.updateCommitmentProgress).toHaveBeenCalledWith({
      customerId: 'cust-1',
      commitmentId: 'c1',
      progress: 0.6,
    });

    await controller.addInteraction({ customerId: 'cust-1', interaction: { title: '通话' } });
    expect(profileService.addInteraction).toHaveBeenCalledWith({ customerId: 'cust-1', interaction: { title: '通话' } });

    await controller.markAsVIP({ customerId: 'cust-1', reason: '贡献', vipLevel: 'gold', markedBy: 'agent' });
    expect(profileService.markAsVIP).toHaveBeenCalledWith({
      customerId: 'cust-1',
      reason: '贡献',
      vipLevel: 'gold',
      markedBy: 'agent',
    });

    await controller.getProfile({ customerId: 'cust-1', includeHistory: true, includeInsights: false });
    const profileQuery = profileService.getProfile.mock.calls[0][0];
    expect(profileQuery.constructor.name).toBe(GetProfileQuery.name);
    expect(profileQuery.includeInsights).toBe(false);
  });

  it('builds requirement commands and queries', async () => {
    const { RequirementController } = await import('../requirement/RequirementController.js');
    const controller = new RequirementController();

    await controller.createRequirement({ content: '需要支持', source: 'manual', confidence: 0.9 });
    const createCommand = requirementService.createRequirement.mock.calls[0][0];
    expect(createCommand.constructor.name).toBe(CreateRequirementCommand.name);

    await controller.updateRequirementStatus({
      requirementId: 'req-1',
      oldStatus: 'pending',
      newStatus: 'processing',
      assignedTo: 'agent',
      resolution: '处理中',
      reason: '跟进',
    });
    expect(requirementService.updateRequirementStatus).toHaveBeenCalled();

    await controller.getRequirementList({ status: 'pending', source: 'manual', limit: 10, offset: 0 });
    const listQuery = requirementService.getRequirementList.mock.calls[0][0];
    expect(listQuery.constructor.name).toBe(GetRequirementListQuery.name);
    expect(listQuery.status).toBe('pending');

    await controller.getRequirement('req-1');
    expect(requirementService.getRequirement).toHaveBeenCalledWith('req-1');
  });

  it('delegates knowledge queries', async () => {
    const { KnowledgeController } = await import('../knowledge/KnowledgeController.js');
    const controller = new KnowledgeController();

    const listResult = await controller.list({ category: 'policy' });
    expect(knowledgeService.listKnowledge).toHaveBeenCalledWith({ category: 'policy' });
    expect(listResult).toEqual([{ id: 'k1' }]);

    const detailResult = await controller.detail('k1');
    expect(knowledgeService.getKnowledgeDetail).toHaveBeenCalledWith('k1');
    expect(detailResult).toEqual({ id: 'k1' });

    const recResult = await controller.recommend({ topic: '退款' });
    expect(knowledgeService.recommendKnowledge).toHaveBeenCalledWith({ topic: '退款' });
    expect(recResult).toEqual([{ id: 'k2' }]);
  });
});
