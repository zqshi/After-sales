/**
 * Fastify Application Factory
 *
 * 创建和配置Fastify应用实例
 */

import fastify, { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
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
import { GetRequirementStatisticsUseCase } from './application/use-cases/requirement/GetRequirementStatisticsUseCase';
import { RequirementRepository } from './infrastructure/repositories/RequirementRepository';
import { ProblemRepository } from './infrastructure/repositories/ProblemRepository';
import { ReviewRequestRepository } from './infrastructure/repositories/ReviewRequestRepository';
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
import { SyncKnowledgeItemUseCase } from './application/use-cases/knowledge/SyncKnowledgeItemUseCase';
import { RetryKnowledgeUploadUseCase } from './application/use-cases/knowledge/RetryKnowledgeUploadUseCase';
import { FaqMiningService } from './application/services/FaqMiningService';
import { KnowledgeAiService } from './application/services/KnowledgeAiService';
import { AiService } from './application/services/AiService';
import { AnalyzeConversationUseCase } from './application/use-cases/ai/AnalyzeConversationUseCase';
import { ApplySolutionUseCase } from './application/use-cases/ai/ApplySolutionUseCase';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';
import { AgentScopeGateway } from './infrastructure/agentscope/AgentScopeGateway';
import { TaskCompletedEventHandler } from './application/event-handlers/TaskCompletedEventHandler';
import { ConversationReadyToCloseEventHandler } from './application/event-handlers/ConversationReadyToCloseEventHandler';
import { RequirementCreatedEventHandler } from './application/event-handlers/RequirementCreatedEventHandler';
import { ProblemResolvedEventHandler } from './application/event-handlers/ProblemResolvedEventHandler';
import { ConversationTaskCoordinator } from './application/services/ConversationTaskCoordinator';
import { metricsMiddleware, metricsResponseHook } from './presentation/http/middleware/metricsMiddleware';
import metricsRoutes from './presentation/http/routes/metricsRoutes';
import { authRoutes } from './presentation/http/routes/authRoutes';
import { AuthController } from './presentation/http/controllers/AuthController';
import { LoginUseCase } from './application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/auth/RegisterUseCase';
import { GetCurrentUserUseCase } from './application/use-cases/auth/GetCurrentUserUseCase';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { RoleRepository } from './infrastructure/repositories/RoleRepository';
import { authMiddleware } from './presentation/http/middleware/authMiddleware';
import { config } from './config/app.config';
import { AuditEventRepository } from './infrastructure/repositories/AuditEventRepository';
import { CreateAuditEventUseCase } from './application/use-cases/audit/CreateAuditEventUseCase';
import { AuditController } from './presentation/http/controllers/AuditController';
import { auditRoutes } from './presentation/http/routes/auditRoutes';
import { SessionController } from './presentation/http/controllers/SessionController';
import { sessionRoutes } from './presentation/http/routes/sessionRoutes';
import { rbacMiddleware } from './presentation/http/middleware/rbacMiddleware';
import { GetReportSummaryUseCase } from './application/use-cases/report/GetReportSummaryUseCase';
import { MonitoringAlertRepository } from './infrastructure/repositories/MonitoringAlertRepository';
import { CreateMonitoringAlertUseCase } from './application/use-cases/monitoring/CreateMonitoringAlertUseCase';
import { ListMonitoringAlertsUseCase } from './application/use-cases/monitoring/ListMonitoringAlertsUseCase';
import { ResolveMonitoringAlertUseCase } from './application/use-cases/monitoring/ResolveMonitoringAlertUseCase';
import { MonitoringController } from './presentation/http/controllers/MonitoringController';
import { monitoringRoutes } from './presentation/http/routes/monitoringRoutes';
import { PermissionController } from './presentation/http/controllers/PermissionController';
import { permissionRoutes } from './presentation/http/routes/permissionRoutes';
import { ListRolesUseCase } from './application/use-cases/permissions/ListRolesUseCase';
import { CreateRoleUseCase } from './application/use-cases/permissions/CreateRoleUseCase';
import { UpdateRoleUseCase } from './application/use-cases/permissions/UpdateRoleUseCase';
import { DeleteRoleUseCase } from './application/use-cases/permissions/DeleteRoleUseCase';
import { ListMembersUseCase } from './application/use-cases/permissions/ListMembersUseCase';
import { CreateMemberUseCase } from './application/use-cases/permissions/CreateMemberUseCase';
import { UpdateMemberUseCase } from './application/use-cases/permissions/UpdateMemberUseCase';
import { DeleteMemberUseCase } from './application/use-cases/permissions/DeleteMemberUseCase';
import { RolePermissionService } from './application/services/RolePermissionService';
import { CreateProblemUseCase } from './application/use-cases/problem/CreateProblemUseCase';
import { UpdateProblemStatusUseCase } from './application/use-cases/problem/UpdateProblemStatusUseCase';
import { CreateReviewRequestUseCase } from './application/use-cases/review/CreateReviewRequestUseCase';
import { CompleteReviewRequestUseCase } from './application/use-cases/review/CompleteReviewRequestUseCase';
import { OutboxEventBus } from './infrastructure/events/OutboxEventBus';
import { OutboxProcessor } from './infrastructure/events/OutboxProcessor';

export async function createApp(
  dataSource: DataSource,
): Promise<FastifyInstance> {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  if (process.env.NODE_ENV === 'production') {
    await app.register(helmet);
  }

  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
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
  const problemRepository = new ProblemRepository(dataSource);
  const reviewRequestRepository = new ReviewRequestRepository(dataSource);
  const taskRepository = new TaskRepository(dataSource);
  const knowledgeRepository = new KnowledgeRepository(dataSource);
  const userRepository = new UserRepository(dataSource);
  const roleRepository = new RoleRepository(dataSource);
  const auditEventRepository = new AuditEventRepository(dataSource);
  const monitoringAlertRepository = new MonitoringAlertRepository(dataSource);
  const eventBus = new EventBus();
  const taxkbAdapter = new TaxKBAdapter();
  const taxkbKnowledgeRepository = new TaxKBKnowledgeRepository(taxkbAdapter);

  const rolePermissionService = new RolePermissionService(roleRepository);
  await rolePermissionService.refresh();
  app.decorate('rolePermissionService', rolePermissionService);

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
  const createProblemUseCase = new CreateProblemUseCase(problemRepository);
  const updateProblemStatusUseCase = new UpdateProblemStatusUseCase(problemRepository);
  const createReviewRequestUseCase = new CreateReviewRequestUseCase(reviewRequestRepository);
  const completeReviewRequestUseCase = new CompleteReviewRequestUseCase(reviewRequestRepository);
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
  const getRequirementStatisticsUseCase = new GetRequirementStatisticsUseCase(
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
    eventBus,
  );
  const getKnowledgeItemUseCase = new GetKnowledgeItemUseCase(
    knowledgeRepository,
    taxkbKnowledgeRepository,
    taxkbAdapter,
  );
  const listKnowledgeItemsUseCase = new ListKnowledgeItemsUseCase(
    knowledgeRepository,
  );
  const updateKnowledgeItemUseCase = new UpdateKnowledgeItemUseCase(
    knowledgeRepository,
    eventBus,
  );
  const deleteKnowledgeItemUseCase = new DeleteKnowledgeItemUseCase(
    knowledgeRepository,
    eventBus,
  );
  const knowledgeAiService = new KnowledgeAiService();
  const faqMiningService = new FaqMiningService(
    knowledgeRepository,
    eventBus,
    knowledgeAiService,
  );
  const syncKnowledgeItemUseCase = new SyncKnowledgeItemUseCase(
    knowledgeRepository,
    taxkbKnowledgeRepository,
    taxkbAdapter,
    eventBus,
    faqMiningService,
    knowledgeAiService,
  );
  const retryKnowledgeUploadUseCase = new RetryKnowledgeUploadUseCase(
    knowledgeRepository,
    taxkbKnowledgeRepository,
    taxkbAdapter,
    eventBus,
  );
  const searchKnowledgeUseCase = new SearchKnowledgeUseCase(
    taxkbKnowledgeRepository,
    knowledgeRepository,
    taxkbAdapter,
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
    getRequirementStatisticsUseCase,
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
    syncKnowledgeItemUseCase,
    retryKnowledgeUploadUseCase,
    taxkbAdapter,
  );
  const knowledgeRecommender = new KnowledgeRecommender();
  const aiService = new AiService(knowledgeRepository, knowledgeRecommender);
  const analyzeConversationUseCase = new AnalyzeConversationUseCase(aiService);
  const applySolutionUseCase = new ApplySolutionUseCase(aiService);
  const aiController = new AiController(analyzeConversationUseCase, applySolutionUseCase);
  const loginUseCase = new LoginUseCase(userRepository);
  const registerUseCase = new RegisterUseCase(userRepository);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);
  const authController = new AuthController(
    loginUseCase,
    registerUseCase,
    getCurrentUserUseCase,
  );
  const createAuditEventUseCase = new CreateAuditEventUseCase(auditEventRepository);
  const getReportSummaryUseCase = new GetReportSummaryUseCase(dataSource);
  const auditController = new AuditController(
    createAuditEventUseCase,
    getReportSummaryUseCase,
  );
  const sessionController = new SessionController(roleRepository);
  const listRolesUseCase = new ListRolesUseCase(roleRepository);
  const createRoleUseCase = new CreateRoleUseCase(roleRepository);
  const updateRoleUseCase = new UpdateRoleUseCase(roleRepository);
  const deleteRoleUseCase = new DeleteRoleUseCase(roleRepository, userRepository);
  const listMembersUseCase = new ListMembersUseCase(userRepository);
  const createMemberUseCase = new CreateMemberUseCase(userRepository, roleRepository);
  const updateMemberUseCase = new UpdateMemberUseCase(userRepository, roleRepository);
  const deleteMemberUseCase = new DeleteMemberUseCase(userRepository);
  const permissionController = new PermissionController(
    listRolesUseCase,
    createRoleUseCase,
    updateRoleUseCase,
    deleteRoleUseCase,
    listMembersUseCase,
    createMemberUseCase,
    updateMemberUseCase,
    deleteMemberUseCase,
  );
  const createMonitoringAlertUseCase = new CreateMonitoringAlertUseCase(monitoringAlertRepository);
  const listMonitoringAlertsUseCase = new ListMonitoringAlertsUseCase(monitoringAlertRepository);
  const resolveMonitoringAlertUseCase = new ResolveMonitoringAlertUseCase(monitoringAlertRepository);
  const monitoringController = new MonitoringController(
    createMonitoringAlertUseCase,
    listMonitoringAlertsUseCase,
    resolveMonitoringAlertUseCase,
  );

  //创建ConversationTaskCoordinator应用层协调服务
  // 用于Saga协调：客户消息→Conversation→Requirement→Task→完成→关闭
  const conversationTaskCoordinator = new ConversationTaskCoordinator(
    conversationRepository,
    taskRepository,
    requirementRepository,
    problemRepository,
    createConversationUseCase,
    createRequirementUseCase,
    createTaskUseCase,
    closeConversationUseCase,
    sendMessageUseCase,
    associateRequirementWithConversationUseCase,
    createProblemUseCase,
    updateProblemStatusUseCase,
    createReviewRequestUseCase,
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
    customerProfileRepository,
    sendMessageUseCase,
    reviewRequestRepository,
    completeReviewRequestUseCase,
    createTaskUseCase,
    problemRepository,
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
    requirementRepository,
  );
  const problemResolvedEventHandler = new ProblemResolvedEventHandler();

  // 订阅事件
  eventBus.subscribe('TaskCompleted', (event) => taskCompletedEventHandler.handle(event as any));
  eventBus.subscribe('ConversationReadyToClose', (event) =>
    conversationReadyToCloseEventHandler.handle(event as any),
  );
  eventBus.subscribe('RequirementCreated', (event) =>
    requirementCreatedEventHandler.handle(event as any),
  );
  eventBus.subscribe('ProblemResolved', (event) =>
    problemResolvedEventHandler.handle(event as any),
  );

  if (config.outbox.enabled) {
    const outboxEventBus = new OutboxEventBus(dataSource);
    const outboxProcessor = new OutboxProcessor(outboxEventBus, eventBus, dataSource);
    outboxProcessor.start(config.outbox.intervalMs);
    app.decorate('outboxProcessor', outboxProcessor);
    app.log.info(`[Outbox] Processor started (interval ${config.outbox.intervalMs}ms)`);
  }

  // 注册路由 - 所有业务路由添加 /api/v1 前缀
  await app.register(async (apiApp) => {
    apiApp.addHook('preHandler', authMiddleware);
    apiApp.addHook('preHandler', rbacMiddleware);
    apiApp.addHook('onResponse', async (request, reply) => {
      const config = request.routeOptions.config as { auth?: boolean; audit?: boolean } | undefined;
      if (config?.auth === false || config?.audit === false) {
        return;
      }
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return;
      }
      if (request.routerPath?.includes('/audit/events')) {
        return;
      }

      const user = request.user as { sub?: string } | undefined;
      await createAuditEventUseCase.execute({
        action: request.method,
        resource: request.routerPath || request.url,
        metadata: {
          statusCode: reply.statusCode,
        },
      }, {
        userId: user?.sub ?? null,
        ip: request.ip,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      });
    });
    await authRoutes(apiApp, authController);
    await sessionRoutes(apiApp, sessionController);
    await permissionRoutes(apiApp, permissionController);
    await auditRoutes(apiApp, auditController);
    await monitoringRoutes(apiApp, monitoringController);
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
