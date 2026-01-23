export interface CreateAuditEventRequestDTO {
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}
