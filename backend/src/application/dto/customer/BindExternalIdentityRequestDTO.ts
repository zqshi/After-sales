export interface BindExternalIdentityRequestDTO {
  customerId: string;
  system: string;
  externalType?: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}
