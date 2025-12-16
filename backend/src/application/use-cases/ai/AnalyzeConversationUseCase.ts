import {
  AiService,
  AnalyzeConversationRequest,
  AnalyzeConversationResult,
} from '../../services/AiService';

export class AnalyzeConversationUseCase {
  constructor(private readonly aiService: AiService) {}

  async execute(request: AnalyzeConversationRequest): Promise<AnalyzeConversationResult> {
    if (!request.conversationId?.trim()) {
      throw new Error('conversationId is required');
    }
    return this.aiService.analyzeConversation(request);
  }
}
