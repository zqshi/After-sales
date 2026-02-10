export interface CreateCustomerProfileRequestDTO {
  customerId: string;
  name: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    preferredChannel?: 'email' | 'phone' | 'chat';
  };
  slaInfo?: {
    serviceLevel?: 'gold' | 'silver' | 'bronze';
    responseTimeTargetMinutes?: number;
    resolutionTimeTargetMinutes?: number;
    lastReviewedAt?: string;
  };
  metrics?: {
    satisfactionScore?: number;
    issueCount?: number;
    averageResolutionMinutes?: number;
    lastUpdated?: string;
  };
  externalBindings?: Array<{
    system: string;
    externalType?: string;
    externalId: string;
    metadata?: Record<string, unknown>;
  }>;
}
