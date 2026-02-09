import { Member } from '../models/Member';

export interface IMemberRepository {
  list(): Promise<Member[]>;
  findById(id: string): Promise<Member | null>;
  findByEmail(email: string): Promise<Member | null>;
  create(member: Partial<Member>): Promise<Member>;
  updateById(id: string, updates: Partial<Member>): Promise<Member | null>;
  deleteById(id: string): Promise<void>;
}
