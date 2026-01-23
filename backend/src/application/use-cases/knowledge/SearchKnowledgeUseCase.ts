import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { TaxKBAdapter } from '@infrastructure/adapters/TaxKBAdapter';

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
  constructor(
    private readonly taxkbRepository: TaxKBKnowledgeRepository,
    private readonly knowledgeRepository?: KnowledgeRepository,
    private readonly taxkbAdapter?: TaxKBAdapter,
  ) {}

  async execute(request: SearchKnowledgeRequest): Promise<KnowledgeItemResponseDTO[] | any[]> {
    const mode = request.mode || 'keyword';
    const filters = request.filters;
    const isTaxkbEnabled = this.taxkbAdapter?.isEnabled?.() ?? true;

    if (mode === 'semantic') {
      if (isTaxkbEnabled) {
        const items = await this.taxkbRepository.semanticSearch(request.query, {
          topK: filters?.topK ?? filters?.limit,
          docIds: filters?.docIds,
        });
        return items.map((item) => KnowledgeItemResponseDTO.fromDomain(item));
      }
      return this.searchLocal(request.query, filters);
    }

    if (mode === 'qa') {
      if (!isTaxkbEnabled) {
        return [];
      }
      return this.taxkbRepository.searchQA(request.query, {
        topK: filters?.topK ?? 5,
        docIds: filters?.docIds,
      });
    }

    const combined = new Map<string, KnowledgeItemResponseDTO>();
    const limit = filters?.limit;

    if (isTaxkbEnabled) {
      try {
        const pagination = limit ? { limit, offset: 0 } : undefined;
        const results = await this.taxkbRepository.findByFilters(
          {
            query: request.query,
            category: filters?.category,
            tags: filters?.tags,
          },
          pagination,
        );
        results.forEach((item) => {
          const dto = KnowledgeItemResponseDTO.fromDomain(item);
          combined.set(dto.id, dto);
        });
      } catch (error) {
        // TaxKB fallback handled below.
      }
    }

    const localResults = await this.searchLocal(request.query, filters);
    localResults.forEach((item) => {
      combined.set(item.id, item);
    });

    const merged = Array.from(combined.values());
    return limit ? merged.slice(0, limit) : merged;
  }

  private async searchLocal(
    query: string,
    filters?: SearchKnowledgeRequest['filters'],
  ): Promise<KnowledgeItemResponseDTO[]> {
    if (!this.knowledgeRepository) {
      return [];
    }
    const pagination = filters?.limit ? { limit: filters.limit, offset: 0 } : undefined;
    const results = await this.knowledgeRepository.findByFilters(
      {
        query,
        category: filters?.category,
        tags: filters?.tags,
      },
      pagination,
    );
    return results.map((item) => KnowledgeItemResponseDTO.fromDomain(item));
  }
}
