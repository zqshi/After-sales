import { Member } from '../../domain/permissions/models/Member';
import { IMemberRepository } from '../../domain/permissions/repositories/IMemberRepository';
import { UserEntity } from '../database/entities/UserEntity';
import { UserRepository } from './UserRepository';

function toDomainMember(entity: UserEntity): Member {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email ?? '',
    roleId: entity.role,
    status: entity.status,
    lastLoginAt: entity.lastLoginAt ?? null,
    createdAt: entity.createdAt,
  };
}

export class PermissionMemberRepository implements IMemberRepository {
  constructor(private readonly userRepository: UserRepository) {}

  async list(): Promise<Member[]> {
    const users = await this.userRepository.list();
    return users.map(toDomainMember);
  }

  async findById(id: string): Promise<Member | null> {
    const user = await this.userRepository.findById(id);
    return user ? toDomainMember(user) : null;
  }

  async findByEmail(email: string): Promise<Member | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? toDomainMember(user) : null;
  }

  async create(member: Partial<Member>): Promise<Member> {
    const created = await this.userRepository.create({
      id: member.id,
      email: member.email ?? null,
      name: member.name ?? '',
      role: member.roleId ?? 'agent',
      status: member.status ?? 'active',
      passwordHash: member.auth?.passwordHash ?? '',
      passwordSalt: member.auth?.passwordSalt ?? '',
      passwordIterations: member.auth?.passwordIterations ?? 120000,
      passwordAlgo: member.auth?.passwordAlgo ?? 'pbkdf2-sha512',
    });
    return toDomainMember(created);
  }

  async updateById(id: string, updates: Partial<Member>): Promise<Member | null> {
    const updated = await this.userRepository.updateById(id, {
      name: updates.name,
      email: updates.email,
      role: updates.roleId,
      status: updates.status,
    });
    return updated ? toDomainMember(updated) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }
}
