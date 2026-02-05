/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { TaxKBAdapter } from '@infrastructure/adapters/TaxKBAdapter';
import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { TaxKBKnowledgeRepository } from '@infrastructure/repositories/TaxKBKnowledgeRepository';

import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';

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

interface CacheEntry {
  data: KnowledgeItemResponseDTO[] | any[];
  timestamp: number;
}

export class SearchKnowledgeUseCase {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒

  constructor(
    private readonly taxkbRepository: TaxKBKnowledgeRepository,
    private readonly knowledgeRepository?: KnowledgeRepository,
    private readonly taxkbAdapter?: TaxKBAdapter,
  ) {}

  /**
   * 生成缓存键
   */
  private getCacheKey(request: SearchKnowledgeRequest): string {
    return JSON.stringify({
      query: request.query,
      mode: request.mode,
      filters: request.filters,
    });
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): KnowledgeItemResponseDTO[] | any[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 保存到缓存
   */
  private saveToCache(key: string, data: KnowledgeItemResponseDTO[] | any[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // 限制缓存大小，超过1000条清理最旧的
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[SearchKnowledgeUseCase] Attempt ${i + 1}/${retries} failed:`,
          error instanceof Error ? error.message : String(error),
        );

        if (i < retries - 1) {
          // 指数退避：1s, 2s, 4s
          const delay = this.RETRY_DELAY * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retries failed');
  }

  async execute(request: SearchKnowledgeRequest): Promise<KnowledgeItemResponseDTO[] | any[]> {
    // 检查缓存
    const cacheKey = this.getCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const mode = request.mode || 'keyword';
    const filters = request.filters;
    const isTaxkbEnabled = this.taxkbAdapter?.isEnabled?.() ?? true;

    let result: KnowledgeItemResponseDTO[] | any[];

    if (mode === 'semantic') {
      if (isTaxkbEnabled) {
        result = await this.executeWithRetry(async () => {
          const items = await this.taxkbRepository.semanticSearch(request.query, {
            topK: filters?.topK ?? filters?.limit,
            docIds: filters?.docIds,
          });
          return items.map((item) => KnowledgeItemResponseDTO.fromDomain(item));
        });
      } else {
        result = await this.searchLocal(request.query, filters);
      }
      this.saveToCache(cacheKey, result);
      return result;
    }

    if (mode === 'qa') {
      if (!isTaxkbEnabled) {
        return [];
      }
      result = await this.executeWithRetry(async () => {
        return this.taxkbRepository.searchQA(request.query, {
          topK: filters?.topK ?? 5,
          docIds: filters?.docIds,
        });
      });
      this.saveToCache(cacheKey, result);
      return result;
    }

    const combined = new Map<string, KnowledgeItemResponseDTO>();
    const limit = filters?.limit;

    if (isTaxkbEnabled) {
      try {
        const pagination = limit ? { limit, offset: 0 } : undefined;
        const results = await this.executeWithRetry(async () => {
          return this.taxkbRepository.findByFilters(
            {
              query: request.query,
              category: filters?.category,
              tags: filters?.tags,
            },
            pagination,
          );
        });
        results.forEach((item) => {
          const dto = KnowledgeItemResponseDTO.fromDomain(item);
          combined.set(dto.id, dto);
        });
      } catch (error) {
        console.error('[SearchKnowledgeUseCase] TaxKB search failed after retries:', error);
        // TaxKB fallback handled below.
      }
    }

    const localResults = await this.searchLocal(request.query, filters);
    localResults.forEach((item) => {
      combined.set(item.id, item);
    });

    const merged = Array.from(combined.values());
    result = limit ? merged.slice(0, limit) : merged;

    this.saveToCache(cacheKey, result);
    return result;
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

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}
