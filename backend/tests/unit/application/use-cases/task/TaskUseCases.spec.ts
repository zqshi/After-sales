/**
 * Task Use Cases 单元测试
 *
 * 测试覆盖：
 * 1. CreateTaskUseCase - 创建任务
 * 2. AssignTaskUseCase - 分配任务
 * 3. UpdateTaskStatusUseCase - 更新任务状态
 * 4. CompleteTaskUseCase - 完成任务
 * 5. GetTaskUseCase - 获取任务
 * 6. ListTasksUseCase - 列出任务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { AssignTaskUseCase } from '@application/use-cases/task/AssignTaskUseCase';
import { UpdateTaskStatusUseCase } from '@application/use-cases/task/UpdateTaskStatusUseCase';
import { CompleteTaskUseCase } from '@application/use-cases/task/CompleteTaskUseCase';
import { GetTaskUseCase } from '@application/use-cases/task/GetTaskUseCase';
import { ListTasksUseCase } from '@application/use-cases/task/ListTasksUseCase';
import { Task } from '@domain/task/models/Task';
import { TaskPriority } from '@domain/task/value-objects/TaskPriority';
import { ValidationError } from '@infrastructure/validation/Validator';

// ============================================
// Mock Dependencies
// ============================================

const createMockTaskRepository = () => ({
  findById: vi.fn(),
  findByFilters: vi.fn(),
  save: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
});

const createMockConversationRepository = () => ({
  findById: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

// ============================================
// Test Suite
// ============================================

describe('Task Use Cases', () => {
  let mockTaskRepo: ReturnType<typeof createMockTaskRepository>;
  let mockConversationRepo: ReturnType<typeof createMockConversationRepository>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockTaskRepo = createMockTaskRepository();
    mockConversationRepo = createMockConversationRepository();
    mockEventBus = createMockEventBus();
  });

  // ============================================
  // CreateTaskUseCase 测试
  // ============================================

  describe('CreateTaskUseCase', () => {
    let useCase: CreateTaskUseCase;

    beforeEach(() => {
      useCase = new CreateTaskUseCase(mockTaskRepo as any, mockConversationRepo as any);
    });

    it('应该成功创建任务', async () => {
      const request = {
        title: '修复登录bug',
        type: 'bug_fix' as const,
        assigneeId: 'agent-001',
        conversationId: 'conv-001',
        priority: 'high' as const,
      };

      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute(request);

      expect(result).toBeDefined();
      expect(result.title).toBe('修复登录bug');
      expect(result.type).toBe('bug_fix');
      expect(result.assigneeId).toBe('agent-001');
      expect(mockTaskRepo.save).toHaveBeenCalled();
    });

    it('应该使用默认优先级创建任务', async () => {
      const request = {
        title: '测试任务',
        type: 'support' as const,
      };

      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute(request);

      expect(result).toBeDefined();
      expect(result.priority).toBe('medium');
    });

    it('应该在缺少标题时抛出错误', async () => {
      const request = {
        type: 'support' as const,
      } as any;

      await expect(useCase.execute(request)).rejects.toThrow(ValidationError);
    });

    it('应该支持设置截止日期', async () => {
      const dueDate = new Date('2026-12-31');
      const request = {
        title: '年度总结',
        type: 'support' as const,
        dueDate: dueDate.toISOString(),
      };

      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute(request);

      expect(result).toBeDefined();
      expect(result.dueDate).toBeDefined();
    });

    it('应该支持关联需求ID', async () => {
      const request = {
        title: '实现新功能',
        type: 'feature' as const,
        requirementId: 'req-001',
      };

      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute(request);

      expect(result).toBeDefined();
      expect(result.requirementId).toBe('req-001');
    });
  });

  // ============================================
  // AssignTaskUseCase 测试
  // ============================================

  describe('AssignTaskUseCase', () => {
    let useCase: AssignTaskUseCase;

    beforeEach(() => {
      useCase = new AssignTaskUseCase(mockTaskRepo as any);
    });

    it('应该成功分配任务', async () => {
      const taskId = 'task-001';
      const assigneeId = 'agent-002';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
      });

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        taskId,
        assigneeId,
      });

      expect(result).toBeDefined();
      expect(result.assigneeId).toBe(assigneeId);
      expect(mockTaskRepo.save).toHaveBeenCalledWith(mockTask);
    });

    it('应该在任务不存在时抛出错误', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          taskId: 'non-existent',
          assigneeId: 'agent-001',
        }),
      ).rejects.toThrow('Task not found: non-existent');
    });

    it('应该在缺少taskId时抛出错误', async () => {
      await expect(
        useCase.execute({
          taskId: '',
          assigneeId: 'agent-001',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('应该在缺少assigneeId时抛出错误', async () => {
      await expect(
        useCase.execute({
          taskId: 'task-001',
          assigneeId: '',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============================================
  // UpdateTaskStatusUseCase 测试
  // ============================================

  describe('UpdateTaskStatusUseCase', () => {
    let useCase: UpdateTaskStatusUseCase;

    beforeEach(() => {
      useCase = new UpdateTaskStatusUseCase(mockTaskRepo as any);
    });

    it('应该成功更新任务状态为in_progress', async () => {
      const taskId = 'task-001';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
      });

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        taskId,
        status: 'in_progress',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
      expect(mockTaskRepo.save).toHaveBeenCalled();
    });

    it('应该成功更新任务状态为cancelled', async () => {
      const taskId = 'task-001';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
      });

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        taskId,
        status: 'cancelled',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('cancelled');
    });

    it('应该在任务不存在时抛出错误', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          taskId: 'non-existent',
          status: 'in_progress',
        }),
      ).rejects.toThrow('Task not found: non-existent');
    });
  });

  // ============================================
  // CompleteTaskUseCase 测试
  // ============================================

  describe('CompleteTaskUseCase', () => {
    let useCase: CompleteTaskUseCase;

    beforeEach(() => {
      useCase = new CompleteTaskUseCase(mockTaskRepo as any, mockEventBus as any);
    });

    it('应该成功完成任务', async () => {
      const taskId = 'task-001';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
        assigneeId: 'agent-001',
      });

      // 模拟任务已开始
      mockTask.start();

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({ taskId });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(mockTaskRepo.save).toHaveBeenCalled();
    });

    it('应该支持设置质量评分', async () => {
      const taskId = 'task-001';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
        assigneeId: 'agent-001',
      });

      mockTask.start();

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        taskId,
        qualityScore: {
          timeliness: 85,
          completeness: 90,
          satisfaction: 88,
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.qualityScore).toBe(88);
    });

    it('应该发布TaskCompleted事件', async () => {
      const taskId = 'task-001';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
        assigneeId: 'agent-001',
      });

      mockTask.start();

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      await useCase.execute({ taskId });

      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('应该在任务不存在时抛出错误', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({ taskId: 'non-existent' })).rejects.toThrow(
        'Task not found: non-existent',
      );
    });
  });

  // ============================================
  // GetTaskUseCase 测试
  // ============================================

  describe('GetTaskUseCase', () => {
    let useCase: GetTaskUseCase;

    beforeEach(() => {
      useCase = new GetTaskUseCase(mockTaskRepo as any);
    });

    it('应该成功获取任务', async () => {
      const taskId = 'task-001';

      const mockTask = Task.create({
        title: '测试任务',
        type: 'support',
        priority: TaskPriority.create('medium'),
      });

      mockTaskRepo.findById.mockResolvedValue(mockTask);

      const result = await useCase.execute({ taskId });

      expect(result).toBeDefined();
      expect(result.title).toBe('测试任务');
      expect(mockTaskRepo.findById).toHaveBeenCalledWith(taskId);
    });

    it('应该在任务不存在时抛出错误', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({ taskId: 'non-existent' })).rejects.toThrow(
        'Task not found: non-existent',
      );
    });
  });

  // ============================================
  // ListTasksUseCase 测试
  // ============================================

  describe('ListTasksUseCase', () => {
    let useCase: ListTasksUseCase;

    beforeEach(() => {
      useCase = new ListTasksUseCase(mockTaskRepo as any);
    });

    it('应该成功列出所有任务', async () => {
      const mockTasks = [
        Task.create({
          title: '任务1',
          type: 'support',
          priority: TaskPriority.create('high'),
        }),
        Task.create({
          title: '任务2',
          type: 'bug_fix',
          priority: TaskPriority.create('medium'),
        }),
      ];

      mockTaskRepo.findByFilters.mockResolvedValue(mockTasks);

      const result = await useCase.execute({});

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('任务1');
      expect(result[1].title).toBe('任务2');
    });

    it('应该支持按状态筛选', async () => {
      const mockTasks = [
        Task.create({
          title: '进行中的任务',
          type: 'support',
          priority: TaskPriority.create('medium'),
        }),
      ];

      mockTaskRepo.findByFilters.mockResolvedValue(mockTasks);

      const result = await useCase.execute({
        status: 'in_progress',
      });

      expect(result).toBeDefined();
      expect(mockTaskRepo.findByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        }),
        expect.any(Object),
      );
    });

    it('应该支持按assigneeId筛选', async () => {
      const mockTasks = [
        Task.create({
          title: '我的任务',
          type: 'support',
          priority: TaskPriority.create('medium'),
          assigneeId: 'agent-001',
        }),
      ];

      mockTaskRepo.findByFilters.mockResolvedValue(mockTasks);

      const result = await useCase.execute({
        assigneeId: 'agent-001',
      });

      expect(result).toBeDefined();
      expect(mockTaskRepo.findByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: 'agent-001',
        }),
        expect.any(Object),
      );
    });

    it('应该支持按conversationId筛选', async () => {
      const mockTasks = [
        Task.create({
          title: '对话任务',
          type: 'support',
          priority: TaskPriority.create('medium'),
          conversationId: 'conv-001',
        }),
      ];

      mockTaskRepo.findByFilters.mockResolvedValue(mockTasks);

      const result = await useCase.execute({
        conversationId: 'conv-001',
      });

      expect(result).toBeDefined();
      expect(mockTaskRepo.findByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-001',
        }),
        expect.any(Object),
      );
    });

    it('应该支持分页', async () => {
      const mockTasks = [
        Task.create({
          title: '任务1',
          type: 'support',
          priority: TaskPriority.create('medium'),
        }),
      ];

      mockTaskRepo.findByFilters.mockResolvedValue(mockTasks);

      const result = await useCase.execute({
        limit: 10,
        offset: 20,
      });

      expect(result).toBeDefined();
      expect(mockTaskRepo.findByFilters).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
      );
    });

    it('应该在没有任务时返回空数组', async () => {
      mockTaskRepo.findByFilters.mockResolvedValue([]);

      const result = await useCase.execute({});

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  // ============================================
  // 集成场景测试
  // ============================================

  describe('Task Lifecycle Integration', () => {
    let createUseCase: CreateTaskUseCase;
    let assignUseCase: AssignTaskUseCase;
    let updateStatusUseCase: UpdateTaskStatusUseCase;
    let completeUseCase: CompleteTaskUseCase;

    beforeEach(() => {
      createUseCase = new CreateTaskUseCase(mockTaskRepo as any, mockConversationRepo as any);
      assignUseCase = new AssignTaskUseCase(mockTaskRepo as any);
      updateStatusUseCase = new UpdateTaskStatusUseCase(mockTaskRepo as any);
      completeUseCase = new CompleteTaskUseCase(mockTaskRepo as any, mockEventBus as any);
    });

    it('应该完成完整的任务生命周期', async () => {
      // 1. 创建任务
      mockTaskRepo.save.mockResolvedValue(undefined);
      const createdTask = await createUseCase.execute({
        title: '完整生命周期测试',
        type: 'support',
        priority: 'high',
      });

      expect(createdTask.status).toBe('pending');

      // 2. 分配任务
      const mockTask = Task.create({
        title: '完整生命周期测试',
        type: 'support',
        priority: TaskPriority.create('high'),
      });

      mockTaskRepo.findById.mockResolvedValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(undefined);

      const assignedTask = await assignUseCase.execute({
        taskId: createdTask.id,
        assigneeId: 'agent-001',
      });

      expect(assignedTask.assigneeId).toBe('agent-001');

      // 3. 开始任务
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      const startedTask = await updateStatusUseCase.execute({
        taskId: createdTask.id,
        status: 'in_progress',
      });

      expect(startedTask.status).toBe('in_progress');

      // 4. 完成任务
      mockTask.start();
      mockTaskRepo.findById.mockResolvedValue(mockTask);
      const completedTask = await completeUseCase.execute({
        taskId: createdTask.id,
        qualityScore: {
          timeliness: 90,
          completeness: 90,
          satisfaction: 90,
        },
      });

      expect(completedTask.status).toBe('completed');
      expect(completedTask.qualityScore).toBe(90);
    });
  });
});
