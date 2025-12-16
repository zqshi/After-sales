import { KnowledgeItem } from '@domain/knowledge/models/KnowledgeItem';

export class KnowledgeItemResponseDTO {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  metadata: Record<string, unknown>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;

  static fromDomain(item: KnowledgeItem): KnowledgeItemResponseDTO {
    const dto = new KnowledgeItemResponseDTO();
    dto.id = item.id;
    dto.title = item.title;
    dto.content = item.content;
    dto.category = item.category.value;
    dto.tags = item.tags;
    dto.source = item.source;
    dto.metadata = item.metadata ?? {};
    dto.isArchived = item.isArchived;
    dto.createdAt = item.createdAt.toISOString();
    dto.updatedAt = item.updatedAt.toISOString();
    return dto;
  }
}
