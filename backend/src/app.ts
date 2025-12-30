/**
 * Fastify Application Factory
 *
 * 创建和配置Fastify应用实例
 */

import fastify, { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { ConversationController } from './presentation/http/controllers/ConversationController';
import { conversationRoutes } from './presentation/http/routes/conversationRoutes';
import { ImController } from './presentation/http/controllers/ImController';
import { imRoutes } from './presentation/http/routes/imRoutes';
import { CreateConversationUseCase } from './application/use-cases/CreateConversationUseCase';
import { ListConversationsUseCase } from './application/use-cases/ListConversationsUseCase';
import { AssignAgentUseCase } from './application/use-cases/AssignAgentUseCase';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import { CloseConversationUseCase } from './application/use-cases/CloseConversationUseCase';
import { AssociateRequirementWithConversationUseCase } from './application/use-cases/requirement/AssociateRequirementWithConversationUseCase';
import { GetConversationUseCase } from './application/use-cases/GetConversationUseCase';
import { ConversationRepository } from './infrastructure/repositories/ConversationRepository';
import { EventBus } from './infrastructure/events/EventBus';
import { CustomerProfileController } from './presentation/http/controllers/CustomerProfileController';
import { CustomerActionController } from './presentation/http/controllers/CustomerActionController';
import { customerRoutes } from './presentation/http/routes/customerRoutes';
import { GetCustomerProfileUseCase } from './application/use-cases/customer/GetCustomerProfileUseCase';
import { RefreshCustomerProfileUseCase } from './application/use-cases/customer/RefreshCustomerProfileUseCase';
import { GetCustomerInteractionsUseCase } from './application/use-cases/customer/GetCustomerInteractionsUseCase';
import { AddServiceRecordUseCase } from './application/use-cases/customer/AddServiceRecordUseCase';
import { UpdateCommitmentProgressUseCase } from './application/use-cases/customer/UpdateCommitmentProgressUseCase';
import { AddInteractionUseCase } from './application/use-cases/customer/AddInteractionUseCase';
import { MarkCustomerAsVIPUseCase } from './application/use-cases/customer/MarkCustomerAsVIPUseCase';
import { CustomerProfileRepository } from './infrastructure/repositories/CustomerProfileRepository';
import { RequirementController } from './presentation/http/controllers/RequirementController';
import { requirementRoutes } from './presentation/http/routes/requirementRoutes';
import { CreateRequirementUseCase } from './application/use-cases/requirement/CreateRequirementUseCase';
import { GetRequirementUseCase } from './application/use-cases/requirement/GetRequirementUseCase';
import { ListRequirementsUseCase } from './application/use-cases/requirement/ListRequirementsUseCase';
import { UpdateRequirementStatusUseCase } from './application/use-cases/requirement/UpdateRequirementStatusUseCase';
import { DeleteRequirementUseCase } from './application/use-cases/requirement/DeleteRequirementUseCase';
import { RequirementRepository } from './infrastructure/repositories/RequirementRepository';
import { TaskController } from './presentation/http/controllers/TaskController';
import { taskRoutes } from './presentation/http/routes/taskRoutes';
import { CreateTaskUseCase } from './application/use-cases/task/CreateTaskUseCase';
import { GetTaskUseCase } from './application/use-cases/task/GetTaskUseCase';
import { ListTasksUseCase } from './application/use-cases/task/ListTasksUseCase';
import { AssignTaskUseCase } from './application/use-cases/task/AssignTaskUseCase';
import { UpdateTaskStatusUseCase } from './application/use-cases/task/UpdateTaskStatusUseCase';
import { CompleteTaskUseCase } from './application/use-cases/task/CompleteTaskUseCase';
import { TaskRepository } from './infrastructure/repositories/TaskRepository';
import multipart from '@fastify/multipart';
import { KnowledgeController } from './presentation/http/controllers/KnowledgeController';
import { AiController } from './presentation/http/controllers/AiController';
import { knowledgeRoutes } from './presentation/http/routes/knowledgeRoutes';
import { aiRoutes } from './presentation/http/routes/aiRoutes';
import { KnowledgeRepository } from './infrastructure/repositories/KnowledgeRepository';
import { TaxKBAdapter } from './infrastructure/adapters/TaxKBAdapter';
import { TaxKBKnowledgeRepository } from './infrastructure/repositories/TaxKBKnowledgeRepository';
import { SearchKnowledgeUseCase } from './application/use-cases/knowledge/SearchKnowledgeUseCase';
import { UploadDocumentUseCase } from './application/use-cases/knowledge/UploadDocumentUseCase';
import { CreateKnowledgeItemUseCase } from './application/use-cases/knowledge/CreateKnowledgeItemUseCase';
import { GetKnowledgeItemUseCase } from './application/use-cases/knowledge/GetKnowledgeItemUseCase';
import { ListKnowledgeItemsUseCase } from './application/use-cases/knowledge/ListKnowledgeItemsUseCase';
import { UpdateKnowledgeItemUseCase } from './application/use-cases/knowledge/UpdateKnowledgeItemUseCase';
import { DeleteKnowledgeItemUseCase } from './application/use-cases/knowledge/DeleteKnowledgeItemUseCase';
import { AiService } from './application/services/AiService';
import { AnalyzeConversationUseCase } from './application/use-cases/ai/AnalyzeConversationUseCase';
import { ApplySolutionUseCase } from './application/use-cases/ai/ApplySolutionUseCase';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';
import { AgentScopeGateway } from './infrastructure/agentscope/AgentScopeGateway';
import { TaskCompletedEventHandler } from './application/event-handlers/TaskCompletedEventHandler';
import { ConversationReadyToCloseEventHandler } from './application/event-handlers/ConversationReadyToCloseEventHandler';
import { RequirementCreatedEventHandler } from './application/event-handlers/RequirementCreatedEventHandler';
import { ConversationTaskCoordinator } from './application/services/ConversationTaskCoordinator';
import { metricsMiddleware, metricsResponseHook } from './presentation/http/middleware/metricsMiddleware';
import metricsRoutes from './presentation/http/routes/metricsRoutes';

export async function createApp(
  dataSource: DataSource,
): Promise<FastifyInstance> {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  // 注册CORS（如果需要）
  if (process.env.NODE_ENV !== 'production') {
    const cors = await import('@fastify/cors');
    await app.register(cors.default, {
      origin: true,
    });
  }

  // 注册Metrics中间件（自动收集HTTP请求指标）
  app.addHook('onRequest', metricsMiddleware);
  app.addHook('onResponse', metricsResponseHook);

  await app.register(multipart, {
    attachFieldsToBody: true,
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  // 创建依赖
  const conversationRepository = new ConversationRepository(dataSource);
  const customerProfileRepository = new CustomerProfileRepository(dataSource);
  const requirementRepository = new RequirementRepository(dataSource);
  const taskRepository = new TaskRepository(dataSource);
  const knowledgeRepository = new KnowledgeRepository(dataSource);
  const eventBus = new EventBus();
  const taxkbAdapter = new TaxKBAdapter();
  const taxkbKnowledgeRepository = new TaxKBKnowledgeRepository(taxkbAdapter);

  const createConversationUseCase = new CreateConversationUseCase(
    conversationRepository,
    eventBus,
  );
  const listConversationsUseCase = new ListConversationsUseCase(
    conversationRepository,
  );
  const assignAgentUseCase = new AssignAgentUseCase(
    conversationRepository,
    eventBus,
  );

  // 创建Use Cases
  const sendMessageUseCase = new SendMessageUseCase(
    conversationRepository,
    eventBus,
  );
  const closeConversationUseCase = new CloseConversationUseCase(
    conversationRepository,
    eventBus,
  );
  const associateRequirementWithConversationUseCase = new AssociateRequirementWithConversationUseCase(
    requirementRepository,
  );
  const getConversationUseCase = new GetConversationUseCase(
    conversationRepository,
  );

  const getCustomerProfileUseCase = new GetCustomerProfileUseCase(
    customerProfileRepository,
  );
  const refreshCustomerProfileUseCase = new RefreshCustomerProfileUseCase(
    customerProfileRepository,
  );
  const getCustomerInteractionsUseCase = new GetCustomerInteractionsUseCase(
    customerProfileRepository,
  );
  const addServiceRecordUseCase = new AddServiceRecordUseCase(
    customerProfileRepository,
  );
  const updateCommitmentProgressUseCase = new UpdateCommitmentProgressUseCase(
    customerProfileRepository,
  );
  const addInteractionUseCase = new AddInteractionUseCase(
    customerProfileRepository,
  );
  const markCustomerAsVIPUseCase = new MarkCustomerAsVIPUseCase(
    customerProfileRepository,
  );
  const createRequirementUseCase = new CreateRequirementUseCase(
    requirementRepository,
    eventBus,
  );
  const getRequirementUseCase = new GetRequirementUseCase(
    requirementRepository,
  );
  const listRequirementsUseCase = new ListRequirementsUseCase(
    requirementRepository,
  );
  const updateRequirementStatusUseCase = new UpdateRequirementStatusUseCase(
    requirementRepository,
  );
  const deleteRequirementUseCase = new DeleteRequirementUseCase(
    requirementRepository,
  );
  const createTaskUseCase = new CreateTaskUseCase(taskRepository);
  const getTaskUseCase = new GetTaskUseCase(taskRepository);
  const listTasksUseCase = new ListTasksUseCase(taskRepository);
  const assignTaskUseCase = new AssignTaskUseCase(taskRepository);
  const updateTaskStatusUseCase = new UpdateTaskStatusUseCase(taskRepository);
  const completeTaskUseCase = new CompleteTaskUseCase(taskRepository, eventBus);
  const createKnowledgeItemUseCase = new CreateKnowledgeItemUseCase(
    knowledgeRepository,
  );
  const getKnowledgeItemUseCase = new GetKnowledgeItemUseCase(
    knowledgeRepository,
  );
  const listKnowledgeItemsUseCase = new ListKnowledgeItemsUseCase(
    knowledgeRepository,
  );
  const updateKnowledgeItemUseCase = new UpdateKnowledgeItemUseCase(
    knowledgeRepository,
  );
  const deleteKnowledgeItemUseCase = new DeleteKnowledgeItemUseCase(
    knowledgeRepository,
  );
  const searchKnowledgeUseCase = new SearchKnowledgeUseCase(
    taxkbKnowledgeRepository,
  );
  const uploadDocumentUseCase = new UploadDocumentUseCase(
    taxkbAdapter,
    eventBus,
  );

  // 创建Controller
  const conversationController = new ConversationController(
    createConversationUseCase,
    listConversationsUseCase,
    assignAgentUseCase,
    sendMessageUseCase,
    closeConversationUseCase,
    getConversationUseCase,
  );

  const customerProfileController = new CustomerProfileController(
    getCustomerProfileUseCase,
    refreshCustomerProfileUseCase,
    getCustomerInteractionsUseCase,
  );
  const customerActionController = new CustomerActionController(
    addServiceRecordUseCase,
    updateCommitmentProgressUseCase,
    addInteractionUseCase,
    markCustomerAsVIPUseCase,
  );
  const requirementController = new RequirementController(
    createRequirementUseCase,
    getRequirementUseCase,
    listRequirementsUseCase,
    updateRequirementStatusUseCase,
    deleteRequirementUseCase,
  );
  const taskController = new TaskController(
    createTaskUseCase,
    getTaskUseCase,
    listTasksUseCase,
    assignTaskUseCase,
    updateTaskStatusUseCase,
    completeTaskUseCase,
  );
  const knowledgeController = new KnowledgeController(
    createKnowledgeItemUseCase,
    getKnowledgeItemUseCase,
    listKnowledgeItemsUseCase,
    updateKnowledgeItemUseCase,
    deleteKnowledgeItemUseCase,
    searchKnowledgeUseCase,
    uploadDocumentUseCase,
    taxkbAdapter,
  );
  const knowledgeRecommender = new KnowledgeRecommender();
  const aiService = new AiService(knowledgeRepository, knowledgeRecommender);
  const analyzeConversationUseCase = new AnalyzeConversationUseCase(aiService);
  const applySolutionUseCase = new ApplySolutionUseCase(aiService);
  const aiController = new AiController(analyzeConversationUseCase, applySolutionUseCase);

  //创建ConversationTaskCoordinator应用层协调服务
  // 用于Saga协调：客户消息→Conversation→Requirement→Task→完成→关闭
  const conversationTaskCoordinator = new ConversationTaskCoordinator(
    conversationRepository,
    taskRepository,
    requirementRepository,
    createConversationUseCase,
    createRequirementUseCase,
    createTaskUseCase,
    closeConversationUseCase,
    sendMessageUseCase,
    associateRequirementWithConversationUseCase,
    aiService,
    eventBus,
  );

  // 创建ImController - IM消息接入
  const imController = new ImController(
    conversationTaskCoordinator,
    aiService,
    searchKnowledgeUseCase,
    taskRepository,
    conversationRepository,
  );

  // 创建并注册事件处理器
  const taskCompletedEventHandler = new TaskCompletedEventHandler(
    taskRepository,
    conversationRepository,
    eventBus,
  );
  const conversationReadyToCloseEventHandler = new ConversationReadyToCloseEventHandler(
    conversationRepository,
    aiService,
  );
  const requirementCreatedEventHandler = new RequirementCreatedEventHandler(
    createTaskUseCase,
  );

  // 订阅事件
  eventBus.subscribe('TaskCompleted', (event) => taskCompletedEventHandler.handle(event as any));
  eventBus.subscribe('ConversationReadyToClose', (event) =>
    conversationReadyToCloseEventHandler.handle(event as any),
  );
  eventBus.subscribe('RequirementCreated', (event) =>
    requirementCreatedEventHandler.handle(event as any),
  );

  // 注册路由 - 所有业务路由添加 /api/v1 前缀
  await app.register(async (apiApp) => {
    await conversationRoutes(apiApp, conversationController);
    await customerRoutes(
      apiApp,
      customerProfileController,
      customerActionController,
    );
    await requirementRoutes(apiApp, requirementController);
    await taskRoutes(apiApp, taskController);
    await knowledgeRoutes(apiApp, knowledgeController);
    await aiRoutes(apiApp, aiController);
    await imRoutes(apiApp, imController); // IM消息接入路由
  }, { prefix: '/api/v1' });

  // Metrics路由不添加前缀（直接挂载在根路径）
  await metricsRoutes(app);

  const agentScopeDependencies = {
    createConversationUseCase,
    sendMessageUseCase,
    getConversationUseCase,
    closeConversationUseCase,
    getCustomerProfileUseCase,
    refreshCustomerProfileUseCase,
    addServiceRecordUseCase,
    searchKnowledgeUseCase,
    uploadDocumentUseCase,
    getKnowledgeItemUseCase,
    createRequirementUseCase,
    listRequirementsUseCase,
    updateRequirementStatusUseCase,
    createTaskUseCase,
    updateTaskStatusUseCase,
    analyzeConversationUseCase,
    knowledgeRepository,
    knowledgeRecommender,
  };
  const agentScopeGateway = new AgentScopeGateway(app, agentScopeDependencies, eventBus);
  await agentScopeGateway.initialize();

  return app;
}
