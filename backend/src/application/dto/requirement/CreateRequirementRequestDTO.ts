import { RequirementPriorityType } from '@domain/requirement/value-objects/Priority';
import { RequirementSourceType } from '@domain/requirement/value-objects/RequirementSource';

export interface CreateRequirementRequestDTO {
  customerId: string;
  conversationId?: string;
  title: string;
  description?: string;
  category: string;
  priority?: RequirementPriorityType;
  source?: RequirementSourceType;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}
