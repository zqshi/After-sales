import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';

export interface GetKnowledgeItemRequest {
  knowledgeId: string;
}

export class GetKnowledgeItemUseCase {
  constructor(private readonly knowledgeRepository: KnowledgeRepository) {}

  async execute(request: GetKnowledgeItemRequest): Promise<KnowledgeItemResponseDTO> {
    if (!request.knowledgeId) {
      throw new Error('knowledgeId is required');
    }

    const item = await this.knowledgeRepository.findById(request.knowledgeId);
    if (!item) {
      throw new Error(`Knowledge item not found: ${request.knowledgeId}`);
    }

    return KnowledgeItemResponseDTO.fromDomain(item);
  }
}
