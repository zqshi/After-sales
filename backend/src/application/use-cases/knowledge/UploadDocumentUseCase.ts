import { KnowledgeItemCreatedEvent } from '@domain/knowledge/events/KnowledgeItemCreatedEvent';
import { TaxKBAdapter } from '@infrastructure/adapters/TaxKBAdapter';
import { EventBus } from '@infrastructure/events/EventBus';

export interface UploadDocumentRequest {
  file: Buffer;
  title: string;
  fileName?: string;
  category?: string;
  companyEntity?: string;
}

export class UploadDocumentUseCase {
  constructor(
    private readonly adapter: TaxKBAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: UploadDocumentRequest): Promise<string> {
    if (!request.file) {
      throw new Error('file buffer is required');
    }
    if (!request.title) {
      throw new Error('title is required');
    }

    const taxkbDoc = await this.adapter.uploadDocument(request.file, {
      title: request.title,
      filename: request.fileName ?? request.title,
      category: {
        business_domain: request.category || '其他',
        company_entity: request.companyEntity,
      },
    });

    await this.eventBus.publish(
      new KnowledgeItemCreatedEvent(
        { aggregateId: taxkbDoc.doc_id },
        {
          knowledgeId: taxkbDoc.doc_id,
          title: taxkbDoc.title,
          category: request.category || 'other',
          source: 'taxkb',
        },
      ),
    );

    return taxkbDoc.doc_id;
  }
}
