import {
  AiService,
  ApplySolutionRequest,
  ApplySolutionResult,
} from '../../services/AiService';

export class ApplySolutionUseCase {
  constructor(private readonly aiService: AiService) {}

  async execute(request: ApplySolutionRequest): Promise<ApplySolutionResult> {
    if (!request.conversationId?.trim()) {
      throw new Error('conversationId is required');
    }
    if (!request.solutionType?.trim()) {
      throw new Error('solutionType is required');
    }
    return this.aiService.applySolution(request);
  }
}
