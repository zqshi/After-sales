import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { KnowledgeCategory } from '@domain/knowledge/value-objects/KnowledgeCategory';
import { EventBus } from '@infrastructure/events/EventBus';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';

import { CreateKnowledgeItemRequestDTO } from '../../dto/knowledge/CreateKnowledgeItemRequestDTO';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';


export class CreateKnowledgeItemUseCase {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly eventBus: EventBus,
  ) {}

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
    await this.eventBus.publishAll(item.getUncommittedEvents());
    item.clearEvents();
    return KnowledgeItemResponseDTO.fromDomain(item);
  }
}
