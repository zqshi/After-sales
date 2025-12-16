import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';

export interface UpdateKnowledgeItemRequest {
  knowledgeId: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class UpdateKnowledgeItemUseCase {
  constructor(private readonly knowledgeRepository: KnowledgeRepository) {}

  async execute(request: UpdateKnowledgeItemRequest): Promise<KnowledgeItemResponseDTO> {
    if (!request.knowledgeId) {
      throw new Error('knowledgeId is required');
    }

    const item = await this.knowledgeRepository.findById(request.knowledgeId);
    if (!item) {
      throw new Error(`Knowledge item not found: ${request.knowledgeId}`);
    }

    const category = request.category ? KnowledgeCategory.create(request.category) : undefined;

    item.update({
      title: request.title,
      content: request.content,
      category,
      tags: request.tags,
      metadata: request.metadata,
    });

    await this.knowledgeRepository.save(item);
    return KnowledgeItemResponseDTO.fromDomain(item);
  }
}
