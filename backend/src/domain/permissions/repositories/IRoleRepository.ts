import { Role } from '../models/Role';

export interface IRoleRepository {
  list(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByKey(key: string): Promise<Role | null>;
  create(role: Partial<Role>): Promise<Role>;
  updateById(id: string, updates: Partial<Role>): Promise<Role | null>;
  deleteById(id: string): Promise<void>;
}
