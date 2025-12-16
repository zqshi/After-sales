import { CustomerProfile } from '../models/CustomerProfile';

export interface ICustomerProfileRepository {
  findById(customerId: string): Promise<CustomerProfile | null>;
  save(profile: CustomerProfile): Promise<void>;
  findInteractions(customerId: string): Promise<Record<string, unknown>[]>;
}
