import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';
import { TaxKBAdapter } from '@infrastructure/adapters/TaxKBAdapter';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';
import { EventBus } from '@infrastructure/events/EventBus';

export interface RetryKnowledgeUploadRequest {
  knowledgeId: string;
}

export class RetryKnowledgeUploadUseCase {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly taxkbRepository: TaxKBKnowledgeRepository,
    private readonly taxkbAdapter: TaxKBAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: RetryKnowledgeUploadRequest): Promise<KnowledgeItemResponseDTO> {
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
      typeof (metadata as Record<string, unknown>).uploadDocId === 'string'
        ? (metadata as Record<string, unknown>).uploadDocId
        : '';
    const fileName =
      (typeof (metadata as Record<string, unknown>).fileName === 'string'
        ? (metadata as Record<string, unknown>).fileName
        : '') || item.title;
    const fileHash =
      typeof (metadata as Record<string, unknown>).fileHash === 'string'
        ? (metadata as Record<string, unknown>).fileHash
        : '';

    let taxkbItem = null;
    try {
      if (uploadDocId) {
        taxkbItem = await this.taxkbRepository.findById(uploadDocId);
      }
      if (!taxkbItem && fileName && fileHash) {
        taxkbItem = await this.taxkbRepository.findByFileHash(fileName, fileHash);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TaxKB request failed';
      const nextMetadata = {
        ...(metadata as Record<string, unknown>),
        status: 'retry',
        uploadPending: false,
        uploadError: message,
      };
      item.update({ metadata: nextMetadata });
      await this.knowledgeRepository.save(item);
      await this.eventBus.publishAll(item.getUncommittedEvents());
      item.clearEvents();
      return KnowledgeItemResponseDTO.fromDomain(item);
    }

    if (!taxkbItem) {
      return KnowledgeItemResponseDTO.fromDomain(item);
    }

    const taxkbStatus = (taxkbItem.metadata as Record<string, unknown> | undefined)?.status;
    const nextStatus =
      typeof taxkbStatus === 'string' && ['active', 'archived', 'deprecated'].includes(taxkbStatus)
        ? taxkbStatus
        : 'processing';

    const nextMetadata = {
      ...(metadata as Record<string, unknown>),
      uploadDocId: taxkbItem.id,
      taxkbDocId: taxkbItem.id,
      status: nextStatus,
      uploadPending: false,
      uploadError: undefined,
    };

    item.update({ metadata: nextMetadata });
    await this.knowledgeRepository.save(item);
    await this.eventBus.publishAll(item.getUncommittedEvents());
    item.clearEvents();

    return KnowledgeItemResponseDTO.fromDomain(item);
  }
}
