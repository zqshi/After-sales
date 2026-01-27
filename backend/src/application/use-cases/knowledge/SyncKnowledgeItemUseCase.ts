import { FaqMiningService } from '@application/services/FaqMiningService';
import { KnowledgeAiService } from '@application/services/KnowledgeAiService';
import { TaxKBAdapter } from '@infrastructure/adapters/TaxKBAdapter';
import { EventBus } from '@infrastructure/events/EventBus';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';

import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';


export interface SyncKnowledgeItemRequest {
  knowledgeId: string;
  uploadDocId?: string;
}

export class SyncKnowledgeItemUseCase {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly taxkbRepository: TaxKBKnowledgeRepository,
    private readonly taxkbAdapter: TaxKBAdapter,
    private readonly eventBus: EventBus,
    private readonly faqMiningService: FaqMiningService,
    private readonly knowledgeAiService: KnowledgeAiService,
  ) {}

  async execute(request: SyncKnowledgeItemRequest): Promise<KnowledgeItemResponseDTO> {
    if (!request.knowledgeId) {
      throw new Error('knowledgeId is required');
    }

    const item = await this.knowledgeRepository.findById(request.knowledgeId);
    if (!item) {
      throw new Error(`Knowledge item not found: ${request.knowledgeId}`);
    }

    if (!this.taxkbAdapter.isEnabled()) {
      return KnowledgeItemResponseDTO.fromDomain(item);
    }

    const metadata = item.metadata ?? {};
    const uploadDocId =
      (typeof request.uploadDocId === 'string' && request.uploadDocId) ||
      (typeof (metadata).uploadDocId === 'string'
        ? ((metadata).uploadDocId)
        : '');

    if (!uploadDocId) {
      return KnowledgeItemResponseDTO.fromDomain(item);
    }

    const taxkbItem = await this.taxkbRepository.findById(uploadDocId);
    if (!taxkbItem || !taxkbItem.content) {
      return KnowledgeItemResponseDTO.fromDomain(item);
    }

    const nextMetadata: Record<string, unknown> = {
      ...(metadata),
      taxkbDocId: uploadDocId,
      status: 'active',
      taxkbSyncedAt: new Date().toISOString(),
    };

    const existingSummary =
      typeof (metadata).summary === 'string'
        ? String((metadata).summary)
        : '';
    const shouldGenerateSummary =
      !existingSummary ||
      existingSummary.includes('文档上传处理中') ||
      existingSummary.includes('处理完成后可查看摘要');
    if (shouldGenerateSummary && this.knowledgeAiService.isEnabled()) {
      try {
        const summary = await this.knowledgeAiService.generateSummary(item.title, taxkbItem.content);
        if (summary) {
          nextMetadata.summary = summary;
          nextMetadata.aiSummaryAt = new Date().toISOString();
        }
      } catch {
        // Ignore AI failures and keep existing summary.
      }
    }

    let nextTags = taxkbItem.tags;
    const existingTags = item.tags ?? [];
    const meaningfulTags = existingTags.filter((tag) => tag !== '上传文档');
    if (!meaningfulTags.length && this.knowledgeAiService.isEnabled()) {
      try {
        const aiTags = await this.knowledgeAiService.generateTags(item.title, taxkbItem.content, 10);
        if (aiTags.length) {
          nextTags = aiTags;
          nextMetadata.aiTagsAt = new Date().toISOString();
        }
      } catch {
        // Ignore AI failures and keep existing tags.
      }
    }

    item.update({
      content: taxkbItem.content,
      tags: nextTags,
      metadata: nextMetadata,
    });

    await this.knowledgeRepository.save(item);
    await this.eventBus.publishAll(item.getUncommittedEvents());
    item.clearEvents();

    const updatedItem = await this.faqMiningService.generateForItem(item);
    return KnowledgeItemResponseDTO.fromDomain(updatedItem);
  }
}
