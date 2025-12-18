import { CreateConversationUseCase } from '@application/use-cases/CreateConversationUseCase';
import { SendMessageUseCase } from '@application/use-cases/SendMessageUseCase';
import { GetConversationUseCase } from '@application/use-cases/GetConversationUseCase';
import { CloseConversationUseCase } from '@application/use-cases/CloseConversationUseCase';
import { GetCustomerProfileUseCase } from '@application/use-cases/customer/GetCustomerProfileUseCase';
import { RefreshCustomerProfileUseCase } from '@application/use-cases/customer/RefreshCustomerProfileUseCase';
import { AddServiceRecordUseCase } from '@application/use-cases/customer/AddServiceRecordUseCase';
import { SearchKnowledgeUseCase } from '@application/use-cases/knowledge/SearchKnowledgeUseCase';
import { UploadDocumentUseCase } from '@application/use-cases/knowledge/UploadDocumentUseCase';
import { GetKnowledgeItemUseCase } from '@application/use-cases/knowledge/GetKnowledgeItemUseCase';
import { CreateRequirementUseCase } from '@application/use-cases/requirement/CreateRequirementUseCase';
import { ListRequirementsUseCase } from '@application/use-cases/requirement/ListRequirementsUseCase';
import { UpdateRequirementStatusUseCase } from '@application/use-cases/requirement/UpdateRequirementStatusUseCase';
import { CreateTaskUseCase } from '@application/use-cases/task/CreateTaskUseCase';
import { UpdateTaskStatusUseCase } from '@application/use-cases/task/UpdateTaskStatusUseCase';
import { AnalyzeConversationUseCase } from '@application/use-cases/ai/AnalyzeConversationUseCase';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeRecommender } from '@domain/knowledge/services/KnowledgeRecommender';

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean; description?: string }>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentScopeDependencies {
  createConversationUseCase: CreateConversationUseCase;
  sendMessageUseCase: SendMessageUseCase;
  getConversationUseCase: GetConversationUseCase;
  closeConversationUseCase: CloseConversationUseCase;
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
}
