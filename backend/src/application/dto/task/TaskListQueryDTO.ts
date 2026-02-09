export interface TaskListQueryDTO {
  assigneeId?: string;
  conversationId?: string;
  requirementId?: string;
  type?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}
