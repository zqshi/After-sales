import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';

export interface DeleteKnowledgeItemRequest {
  knowledgeId: string;
}

export class DeleteKnowledgeItemUseCase {
  constructor(private readonly knowledgeRepository: KnowledgeRepository) {}

  async execute(request: DeleteKnowledgeItemRequest): Promise<void> {
    if (!request.knowledgeId) {
      throw new Error('knowledgeId is required');
    }
    const item = await this.knowledgeRepository.findById(request.knowledgeId);
    if (!item) {
      throw new Error(`Knowledge item not found: ${request.knowledgeId}`);
    }
    await this.knowledgeRepository.delete(request.knowledgeId);
  }
}
