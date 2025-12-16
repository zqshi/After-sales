import { KnowledgeItem } from '../models/KnowledgeItem';

export interface KnowledgeFilters {
  category?: string;
  source?: string;
  tags?: string[];
  query?: string;
}

export interface KnowledgePagination {
  limit: number;
  offset: number;
}

export interface IKnowledgeRepository {
  save(item: KnowledgeItem): Promise<void>;
  findById(id: string): Promise<KnowledgeItem | null>;
  findByFilters(filters: KnowledgeFilters, pagination?: KnowledgePagination): Promise<KnowledgeItem[]>;
  countByFilters(filters: KnowledgeFilters): Promise<number>;
  delete(id: string): Promise<void>;
}
