import { CustomerProfile } from '@domain/customer/models/CustomerProfile';
import { ContactInfo } from '@domain/customer/value-objects/ContactInfo';
import { CustomerLevelInfo } from '@domain/customer/value-objects/CustomerLevelInfo';
import { Metrics } from '@domain/customer/value-objects/Metrics';

export function buildCustomerProfile(overrides: Partial<{
  customerId: string;
  name: string;
}> = {}): CustomerProfile {
  return CustomerProfile.create({
    customerId: overrides.customerId ?? 'cust-1',
    name: overrides.name ?? 'Test Customer',
    contactInfo: ContactInfo.create({
      email: 'test@example.com',
      phone: '13800138000',
      address: 'Test St',
      preferredChannel: 'email',
    }),
    slaInfo: CustomerLevelInfo.create({
      serviceLevel: 'gold',
      responseTimeTargetMinutes: 30,
      resolutionTimeTargetMinutes: 120,
    }),
    metrics: Metrics.create({
      satisfactionScore: 80,
      issueCount: 1,
      averageResolutionMinutes: 60,
    }),
  });
}
