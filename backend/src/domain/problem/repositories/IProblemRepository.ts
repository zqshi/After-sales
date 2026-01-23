import { Problem } from '../models/Problem';
import { ProblemStatus } from '../types';

export interface ProblemQueryFilters {
  conversationId?: string;
  customerId?: string;
  status?: ProblemStatus;
}

export interface IProblemRepository {
  findById(id: string): Promise<Problem | null>;
  findByFilters(filters: ProblemQueryFilters, pagination?: { limit: number; offset: number }): Promise<Problem[]>;
  countByFilters(filters: ProblemQueryFilters): Promise<number>;
  findActiveByConversationId(conversationId: string): Promise<Problem | null>;
  findLatestResolvedByConversationId(conversationId: string): Promise<Problem | null>;
  save(problem: Problem): Promise<void>;
}
