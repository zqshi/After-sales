import { EventBus } from '@infrastructure/events/EventBus';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';

export interface DeleteKnowledgeItemRequest {
  knowledgeId: string;
  deleteRelatedFaq?: boolean;
}

export class DeleteKnowledgeItemUseCase {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: DeleteKnowledgeItemRequest): Promise<void> {
    if (!request.knowledgeId) {
      throw new Error('knowledgeId is required');
    }
    const item = await this.knowledgeRepository.findById(request.knowledgeId);
    if (!item) {
      throw new Error(`Knowledge item not found: ${request.knowledgeId}`);
    }

    const relatedFaqs = await this.knowledgeRepository.findByFilters({ category: 'faq' });
    const linkedFaqs = relatedFaqs.filter((faq) => {
      const metadata = faq.metadata;
      const sourceDocIds = Array.isArray(metadata?.sourceDocIds) ? metadata?.sourceDocIds : [];
      return sourceDocIds.includes(request.knowledgeId);
    });

    if (request.deleteRelatedFaq && linkedFaqs.length) {
      for (const faq of linkedFaqs) {
        faq.archive();
        await this.knowledgeRepository.delete(faq.id);
        await this.eventBus.publishAll(faq.getUncommittedEvents());
        faq.clearEvents();
      }
    } else if (linkedFaqs.length) {
      for (const faq of linkedFaqs) {
        const metadata = faq.metadata;
        const nextMetadata = {
          ...(metadata ?? {}),
          sourceStatus: 'deleted',
          sourceDocDeleted: true,
        };
        faq.update({ metadata: nextMetadata });
        await this.knowledgeRepository.save(faq);
        await this.eventBus.publishAll(faq.getUncommittedEvents());
        faq.clearEvents();
      }
    }

    item.archive();
    await this.knowledgeRepository.delete(request.knowledgeId);
    await this.eventBus.publishAll(item.getUncommittedEvents());
    item.clearEvents();
  }
}
