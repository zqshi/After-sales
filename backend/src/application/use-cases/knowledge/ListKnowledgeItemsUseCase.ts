import { KnowledgeRepository } from '@infrastructure/repositories/KnowledgeRepository';
import { KnowledgeListQueryDTO } from '../../dto/knowledge/KnowledgeListQueryDTO';
import { KnowledgeListResponseDTO } from '../../dto/knowledge/KnowledgeListResponseDTO';
import { KnowledgeItemResponseDTO } from '../../dto/knowledge/KnowledgeItemResponseDTO';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export class ListKnowledgeItemsUseCase {
  constructor(private readonly knowledgeRepository: KnowledgeRepository) {}

  private normalizePage(page?: number): number {
    return page && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(limit), 100);
  }

  async execute(request: KnowledgeListQueryDTO): Promise<KnowledgeListResponseDTO> {
    const page = this.normalizePage(request.page);
    const limit = this.normalizeLimit(request.limit);
    const offset = (page - 1) * limit;

    const filters = {
      category: request.category,
      source: request.source,
      tags: request.tags ? request.tags.split(',').map((tag) => tag.trim()) : undefined,
      query: request.query,
    };

    const [items, total] = await Promise.all([
      this.knowledgeRepository.findByFilters(filters, { limit, offset }),
      this.knowledgeRepository.countByFilters(filters),
    ]);

    const dtos = items.map((item) => KnowledgeItemResponseDTO.fromDomain(item));

    return KnowledgeListResponseDTO.from(dtos, total, page, limit);
  }
}
