import { KnowledgeItemResponseDTO } from './KnowledgeItemResponseDTO';

export class KnowledgeListResponseDTO {
  items: KnowledgeItemResponseDTO[];
  total: number;
  page: number;
  limit: number;

  static from(
    items: KnowledgeItemResponseDTO[],
    total: number,
    page: number,
    limit: number,
  ): KnowledgeListResponseDTO {
    const dto = new KnowledgeListResponseDTO();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
