export interface TaskListQueryDTO {
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}
