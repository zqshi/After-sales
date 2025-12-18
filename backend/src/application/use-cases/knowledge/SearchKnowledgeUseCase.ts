import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';

export type KnowledgeSearchMode = 'keyword' | 'semantic' | 'qa';

export interface SearchKnowledgeRequest {
  query: string;
  mode?: KnowledgeSearchMode;
  filters?: {
    category?: string;
    tags?: string[];
    limit?: number;
    docIds?: string[];
    topK?: number;
  };
}

export class SearchKnowledgeUseCase {
  constructor(private readonly repository: TaxKBKnowledgeRepository) {}

  async execute(request: SearchKnowledgeRequest): Promise<KnowledgeItemResponseDTO[] | any[]> {
    const mode = request.mode || 'keyword';
    const filters = request.filters;

    if (mode === 'semantic') {
      const items = await this.repository.semanticSearch(request.query, {
        topK: filters?.topK ?? filters?.limit,
      });
      return items.map((item) => KnowledgeItemResponseDTO.fromDomain(item));
    }

    if (mode === 'qa') {
      return this.repository.searchQA(request.query, filters?.topK ?? 5);
    }

    const pagination = filters?.limit ? { limit: filters.limit, offset: 0 } : undefined;
    const results = await this.repository.findByFilters(
      {
        query: request.query,
        category: filters?.category,
        tags: filters?.tags,
      },
      pagination,
    );

    return results.map((item) => KnowledgeItemResponseDTO.fromDomain(item));
  }
}
