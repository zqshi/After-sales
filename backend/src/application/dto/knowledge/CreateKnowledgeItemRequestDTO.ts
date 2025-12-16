export interface CreateKnowledgeItemRequestDTO {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  source: string;
  metadata?: Record<string, unknown>;
}
