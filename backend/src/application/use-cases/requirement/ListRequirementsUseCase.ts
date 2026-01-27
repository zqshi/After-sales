import { RequirementRepository } from '@infrastructure/repositories/RequirementRepository';

import { RequirementListQueryDTO } from '../../dto/requirement/RequirementListQueryDTO';
import { RequirementListResponseDTO } from '../../dto/requirement/RequirementListResponseDTO';
import { RequirementResponseDTO } from '../../dto/requirement/RequirementResponseDTO';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListRequirementsUseCase {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  private normalizePage(page?: number): number {
    if (!page || page < 1) {
      return DEFAULT_PAGE;
    }
    return Math.floor(page);
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(limit), MAX_LIMIT);
  }

  async execute(
    request: RequirementListQueryDTO,
  ): Promise<RequirementListResponseDTO> {
    const page = this.normalizePage(request.page);
    const limit = this.normalizeLimit(request.limit);
    const offset = (page - 1) * limit;

    const filters = {
      customerId: request.customerId,
      conversationId: request.conversationId,
      status: request.status,
      category: request.category,
      priority: request.priority,
    };

    const [requirements, total] = await Promise.all([
      this.requirementRepository.findByFilters(filters, { limit, offset }),
      this.requirementRepository.countByFilters(filters),
    ]);

    const dtos = requirements.map((requirement) =>
      RequirementResponseDTO.fromDomain(requirement),
    );

    return RequirementListResponseDTO.from(dtos, total, page, limit);
  }
}
