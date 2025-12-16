export interface RequirementListQueryDTO {
  customerId?: string;
  conversationId?: string;
  status?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
}
