import { AiService } from '@application/services/AiService';
import { AnalyzeConversationUseCase } from '@application/use-cases/ai/AnalyzeConversationUseCase';
import { CloseConversationUseCase } from '@application/use-cases/CloseConversationUseCase';
import { CreateConversationUseCase } from '@application/use-cases/CreateConversationUseCase';
import { AddServiceRecordUseCase } from '@application/use-cases/customer/AddServiceRecordUseCase';
import { GetCustomerProfileUseCase } from '@application/use-cases/customer/GetCustomerProfileUseCase';
import { RefreshCustomerProfileUseCase } from '@application/use-cases/customer/RefreshCustomerProfileUseCase';
import { GetConversationUseCase } from '@application/use-cases/GetConversationUseCase';
import { GetKnowledgeItemUseCase } from '@application/use-cases/knowledge/GetKnowledgeItemUseCase';
import { SearchKnowledgeUseCase } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';
import { UploadDocumentUseCase } from '@application/use-cases/knowledge/UploadDocumentUseCase';
import { SendMessageUseCase } from '@application/use-cases/SendMessageUseCase';
import { CreateRequirementUseCase } from '@application/use-cases/requirement/CreateRequirementUseCase';
import { ListRequirementsUseCase } from '@application/use-cases/requirement/ListRequirementsUseCase';
import { UpdateRequirementStatusUseCase } from '@application/use-cases/requirement/UpdateRequirementStatusUseCase';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { UpdateTaskStatusUseCase } from '@application/use-cases/task/UpdateTaskStatusUseCase';
import { ListConversationsUseCase } from '@application/use-cases/ListConversationsUseCase';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';
import { ConversationRepository } from '@infrastructure/repositories/ConversationRepository';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { QualityReportRepository } from '@infrastructure/repositories/QualityReportRepository';
import { SurveyRepository } from '@infrastructure/repositories/SurveyRepository';
import { TaskRepository } from '@infrastructure/repositories/TaskRepository';

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean; description?: string }>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentScopeDependencies {
  conversationRepository: ConversationRepository;
  taskRepository: TaskRepository;
  createConversationUseCase: CreateConversationUseCase;
  sendMessageUseCase: SendMessageUseCase;
  getConversationUseCase: GetConversationUseCase;
  closeConversationUseCase: CloseConversationUseCase;
  listConversationsUseCase: ListConversationsUseCase;
  getCustomerProfileUseCase: GetCustomerProfileUseCase;
  refreshCustomerProfileUseCase: RefreshCustomerProfileUseCase;
  addServiceRecordUseCase: AddServiceRecordUseCase;
  searchKnowledgeUseCase: SearchKnowledgeUseCase;
  uploadDocumentUseCase: UploadDocumentUseCase;
  getKnowledgeItemUseCase: GetKnowledgeItemUseCase;
  createRequirementUseCase: CreateRequirementUseCase;
  listRequirementsUseCase: ListRequirementsUseCase;
  updateRequirementStatusUseCase: UpdateRequirementStatusUseCase;
  createTaskUseCase: CreateTaskUseCase;
  updateTaskStatusUseCase: UpdateTaskStatusUseCase;
  analyzeConversationUseCase: AnalyzeConversationUseCase;
  knowledgeRepository: KnowledgeRepository;
  knowledgeRecommender: KnowledgeRecommender;
  aiService: AiService;
  qualityReportRepository: QualityReportRepository;
  surveyRepository: SurveyRepository;
}
