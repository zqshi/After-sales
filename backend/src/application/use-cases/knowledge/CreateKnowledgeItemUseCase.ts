import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import { CreateKnowledgeItemRequestDTO } from '../../dto/knowledge/CreateKnowledgeItemRequestDTO';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';

export class CreateKnowledgeItemUseCase {
  constructor(private readonly knowledgeRepository: KnowledgeRepository) {}

  async execute(
    request: CreateKnowledgeItemRequestDTO,
  ): Promise<KnowledgeItemResponseDTO> {
    if (!request.title) {
      throw new Error('title is required');
    }
    if (!request.content) {
      throw new Error('content is required');
    }
    if (!request.category) {
      throw new Error('category is required');
    }

    const category = KnowledgeCategory.create(request.category);
    const item = KnowledgeItem.create({
      title: request.title,
      content: request.content,
      category,
      tags: request.tags,
      source: request.source,
      metadata: request.metadata,
    });

    await this.knowledgeRepository.save(item);
    return KnowledgeItemResponseDTO.fromDomain(item);
  }
}
