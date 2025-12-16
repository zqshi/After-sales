import { Requirement } from '../models/Requirement';

export interface RequirementPagination {
  limit: number;
  offset: number;
}

export interface IRequirementRepository {
  findById(id: string): Promise<Requirement | null>;
  findByFilters(filters: RequirementQueryFilters, pagination?: RequirementPagination): Promise<Requirement[]>;
  countByFilters(filters: RequirementQueryFilters): Promise<number>;
  save(requirement: Requirement): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface RequirementQueryFilters {
  customerId?: string;
  conversationId?: string;
  status?: string;
  category?: string;
  priority?: string;
}
