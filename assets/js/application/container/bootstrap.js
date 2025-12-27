/**
 * Bootstrap - 容器启动和服务注册
 *
 * 在应用启动时初始化所有服务依赖
 */

import { DIContainer } from './DIContainer.js';

// 基础设施
import { EventBus } from '../../infrastructure/events/EventBus.js';
import { ApiClient } from '../../infrastructure/api/ApiClient.js';

// 仓储
import { ConversationRepository } from '../../infrastructure/repositories/ConversationRepository.js';
import { CustomerProfileRepository } from '../../infrastructure/repositories/CustomerProfileRepository.js';
import { RequirementRepository } from '../../infrastructure/repositories/RequirementRepository.js';
import { TaskRepository } from '../../infrastructure/repositories/TaskRepository.js';
import { KnowledgeRepository } from '../../infrastructure/repositories/KnowledgeRepository.js';

// Domain服务
import { TaskService } from '../../domains/task/services/TaskService.js';

// 应用服务
import { ConversationApplicationService } from '../conversation/ConversationApplicationService.js';
import { CustomerProfileApplicationService } from '../customer/CustomerProfileApplicationService.js';
import { RequirementApplicationService } from '../requirement/RequirementApplicationService.js';
import { TaskApplicationService } from '../task/TaskApplicationService.js';
import { KnowledgeApplicationService } from '../knowledge/KnowledgeApplicationService.js';

/**
 * 创建并配置DI容器
 * @returns {DIContainer} 配置完成的容器实例
 */
export function createContainer() {
  const container = new DIContainer();

  // ==================== 基础设施层 ====================

  // EventBus - 事件总线（单例）
  container.register('eventBus', () => {
    return EventBus.getInstance();
  }, true);

  // ApiClient - API客户端（单例）
  container.register('apiClient', () => {
    return ApiClient.getInstance();
  }, true);

  // ==================== 仓储层 ====================

  // ConversationRepository - 对话仓储（单例）
  container.register('conversationRepository', (c) => {
    const apiClient = c.resolve('apiClient');
    return new ConversationRepository(apiClient);
  }, true);

  // CustomerProfileRepository - 客户画像仓储（单例）
  container.register('profileRepository', () => {
    return new CustomerProfileRepository();
  }, true);

  // RequirementRepository - 需求仓储（单例）
  container.register('requirementRepository', (c) => {
    const apiClient = c.resolve('apiClient');
    return new RequirementRepository(apiClient);
  }, true);

  // TaskRepository - 任务仓储（单例）
  container.register('taskRepository', (c) => {
    const apiClient = c.resolve('apiClient');
    return new TaskRepository(apiClient);
  }, true);

  // KnowledgeRepository - 知识仓储（单例）
  container.register('knowledgeRepository', (c) => {
    const apiClient = c.resolve('apiClient');
    return new KnowledgeRepository(apiClient);
  }, true);

  // ==================== Domain服务层 ====================

  // TaskService - 任务Domain服务（单例）
  container.register('taskService', (c) => {
    const apiClient = c.resolve('apiClient');
    return new TaskService(apiClient);
  }, true);

  // ==================== 应用服务层 ====================

  // ConversationApplicationService - 对话应用服务（单例）
  container.register('conversationApplicationService', (c) => {
    return new ConversationApplicationService({
      conversationRepository: c.resolve('conversationRepository'),
      eventBus: c.resolve('eventBus'),
    });
  }, true);

  // CustomerProfileApplicationService - 客户画像应用服务（单例）
  container.register('customerProfileApplicationService', (c) => {
    return new CustomerProfileApplicationService({
      profileRepository: c.resolve('profileRepository'),
      eventBus: c.resolve('eventBus'),
    });
  }, true);

  // RequirementApplicationService - 需求应用服务（单例）
  container.register('requirementApplicationService', (c) => {
    return new RequirementApplicationService({
      requirementRepository: c.resolve('requirementRepository'),
      eventBus: c.resolve('eventBus'),
    });
  }, true);

  // TaskApplicationService - 任务应用服务（单例）
  container.register('taskApplicationService', (c) => {
    return new TaskApplicationService({
      taskRepository: c.resolve('taskRepository'),
      eventBus: c.resolve('eventBus'),
    });
  }, true);

  container.register('knowledgeApplicationService', (c) => {
    return new KnowledgeApplicationService({
      knowledgeRepository: c.resolve('knowledgeRepository'),
      eventBus: c.resolve('eventBus'),
    });
  }, true);

  return container;
}

// 全局容器实例（延迟初始化）
let _container = null;

/**
 * 获取全局容器实例
 * @returns {DIContainer} 容器实例
 */
export function getContainer() {
  if (!_container) {
    _container = createContainer();
  }
  return _container;
}

/**
 * 初始化容器（在应用启动时调用）
 * @returns {Promise<DIContainer>} 初始化完成的容器
 */
export async function initializeContainer() {
  console.log('[Bootstrap] 初始化依赖注入容器...');

  const container = createContainer();

  // 预热关键服务（可选）
  try {
    container.resolve('eventBus');
    container.resolve('apiClient');
    console.log('[Bootstrap] 容器初始化完成');
  } catch (error) {
    console.error('[Bootstrap] 容器初始化失败:', error);
    throw error;
  }

  _container = container;
  return container;
}
