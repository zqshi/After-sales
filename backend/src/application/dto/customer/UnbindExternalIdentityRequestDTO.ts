export interface UnbindExternalIdentityRequestDTO {
  customerId: string;
  system: string;
  externalType?: string;
  externalId: string;
}
