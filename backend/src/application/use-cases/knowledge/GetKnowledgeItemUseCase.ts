import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';
import { TaxKBAdapter } from '@infrastructure/adapters/TaxKBAdapter';

export interface GetKnowledgeItemRequest {
  knowledgeId: string;
}

export class GetKnowledgeItemUseCase {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly taxkbRepository?: TaxKBKnowledgeRepository,
    private readonly taxkbAdapter?: TaxKBAdapter,
  ) {}

  async execute(request: GetKnowledgeItemRequest): Promise<KnowledgeItemResponseDTO> {
    if (!request.knowledgeId) {
      throw new Error('knowledgeId is required');
    }

    const item = await this.knowledgeRepository.findById(request.knowledgeId);
    if (item) {
      return KnowledgeItemResponseDTO.fromDomain(item);
    }

    if (this.taxkbRepository && this.taxkbAdapter?.isEnabled()) {
      const taxkbItem = await this.taxkbRepository.findById(request.knowledgeId);
      if (taxkbItem) {
        return KnowledgeItemResponseDTO.fromDomain(taxkbItem);
      }
    }

    throw new Error(`Knowledge item not found: ${request.knowledgeId}`);
  }
}
