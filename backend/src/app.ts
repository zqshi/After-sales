/**
 * Fastify Application Factory
 *
 * 创建和配置Fastify应用实例
 */

import fastify, { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { ConversationController } from './presentation/http/controllers/ConversationController';
import { conversationRoutes } from './presentation/http/routes/conversationRoutes';
import { CreateConversationUseCase } from './application/use-cases/CreateConversationUseCase';
import { ListConversationsUseCase } from './application/use-cases/ListConversationsUseCase';
import { AssignAgentUseCase } from './application/use-cases/AssignAgentUseCase';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import { CloseConversationUseCase } from './application/use-cases/CloseConversationUseCase';
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
  const completeTaskUseCase = new CompleteTaskUseCase(taskRepository);
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

  // 注册路由
  await conversationRoutes(app, conversationController);
  await customerRoutes(
    app,
    customerProfileController,
    customerActionController,
  );
  await requirementRoutes(app, requirementController);
  await taskRoutes(app, taskController);
  await knowledgeRoutes(app, knowledgeController);
  await aiRoutes(app, aiController);

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

  // 健康检查端点
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
