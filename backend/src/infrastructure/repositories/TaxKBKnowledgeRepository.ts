import { IKnowledgeRepository, KnowledgeFilters, KnowledgePagination } from '@domain/knowledge/repositories/IKnowledgeRepository';
import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';
import { TaxKBAdapter, TaxKBError } from '../adapters/TaxKBAdapter';
import { TaxKBMapper } from './mappers/TaxKBMapper';

export class TaxKBKnowledgeRepository implements IKnowledgeRepository {
  constructor(private readonly adapter: TaxKBAdapter) {}

  async findById(id: string): Promise<KnowledgeItem | null> {
    try {
      const doc = await this.adapter.getDocument(id, {
        include: ['tags', 'metadata'],
      });
      return TaxKBMapper.toKnowledgeItem(doc);
    } catch (error) {
      if (error instanceof TaxKBError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async findByFilters(filters: KnowledgeFilters, pagination?: KnowledgePagination): Promise<KnowledgeItem[]> {
    const keyword = filters.query || '';
    const limit = pagination?.limit ?? 20;
    const results = await this.adapter.searchDocuments(keyword, {
      status: ['active'],
      limit,
    });

    const items = await Promise.all(
      results.map(async (result) => {
        const doc = await this.adapter.getDocument(result.doc_id, {
          include: ['tags', 'metadata'],
        });
        return TaxKBMapper.toKnowledgeItem(doc);
      }),
    );

    const filtered = items.filter((item) => {
      if (filters.category && item.category.value !== filters.category) {
        return false;
      }
      if (filters.source && item.source !== filters.source) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0) {
        return filters.tags.some((tag) => item.tags.includes(tag));
      }
      return true;
    });

    const offset = pagination?.offset ?? 0;
    const sliceLimit = pagination?.limit ?? filtered.length;
    return filtered.slice(offset, offset + sliceLimit);
  }

  async countByFilters(filters: KnowledgeFilters): Promise<number> {
    const items = await this.findByFilters(filters);
    return items.length;
  }

  async save(_item: KnowledgeItem): Promise<void> {
    console.warn('[TaxKB] save is not supported; upload a new document instead.');
  }

  async delete(id: string): Promise<void> {
    await this.adapter.deleteDocument(id);
  }

  async semanticSearch(query: string, options?: { topK?: number }): Promise<KnowledgeItem[]> {
    const results = await this.adapter.semanticSearch(query, {
      topK: options?.topK,
      includeChunks: false,
    });

    const items = await Promise.all(
      results.map(async (result) => {
        const doc = await this.adapter.getDocument(result.doc_id, {
          include: ['tags', 'metadata'],
        });
        return TaxKBMapper.toKnowledgeItem(doc);
      }),
    );

    return items;
  }

  async searchQA(question: string, topK: number = 5): Promise<ReturnType<TaxKBAdapter['searchQA']>> {
    return this.adapter.searchQA(question, { top_k: topK });
  }
}
