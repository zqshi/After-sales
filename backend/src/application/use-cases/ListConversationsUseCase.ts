import {
  ConversationRepository,
  ConversationFilters,
} from '../../infrastructure/repositories/ConversationRepository';
import { ConversationListQueryDTO } from '../dto/ConversationListQueryDTO';
import { ConversationListResponseDTO } from '../dto/ConversationListResponseDTO';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListConversationsUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(request: ConversationListQueryDTO): Promise<ConversationListResponseDTO> {
    const page = this.normalizePage(request.page);
    const limit = this.normalizeLimit(request.limit);
    const offset = (page - 1) * limit;

    const filters: ConversationFilters = {
      status: request.status,
      agentId: request.agentId,
      customerId: request.customerId,
      channel: request.channel,
      slaStatus: request.slaStatus,
    };

    const [conversations, total] = await Promise.all([
      this.conversationRepository.findByFilters(filters, { limit, offset }),
      this.conversationRepository.countByFilters(filters),
    ]);

    return ConversationListResponseDTO.from(conversations, total, page, limit);
  }

  private normalizePage(page?: number): number {
    if (!page || page <= 0) {
      return DEFAULT_PAGE;
    }

    return Math.floor(page);
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || limit <= 0) {
      return DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(limit), MAX_LIMIT);
  }
}
