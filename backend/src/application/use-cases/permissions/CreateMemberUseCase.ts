import { randomUUID } from 'crypto';

import { UserRepository } from '../../../infrastructure/repositories/UserRepository';
import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';
import { CreateMemberRequestDTO } from '../../dto/permissions/MemberRequestDTO';
import { MemberResponseDTO } from '../../dto/permissions/MemberResponseDTO';
import { hashPassword } from '../../../infrastructure/security/passwordHasher';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export class CreateMemberUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(payload: CreateMemberRequestDTO): Promise<MemberResponseDTO> {
    this.validatePayload(payload);

    if (payload.email) {
      const existing = await this.userRepository.findByEmail(payload.email);
      if (existing) {
        throw new Error('email already exists');
      }
    }

    if (payload.phone) {
      const existing = await this.userRepository.findByPhone(payload.phone);
      if (existing) {
        throw new Error('phone already exists');
      }
    }

    const role = await this.roleRepository.findByKey(payload.roleId);
    if (!role) {
      throw new Error('role not found');
    }

    const password = hashPassword(payload.password);

    const user = await this.userRepository.create({
      id: randomUUID(),
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      name: payload.name.trim(),
      passwordHash: password.hash,
      passwordSalt: password.salt,
      passwordIterations: password.iterations,
      passwordAlgo: password.algorithm,
      role: role.key,
      status: 'active',
      metadata: {
        team: payload.team?.trim() || null,
        badge: payload.badge?.trim() || null,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.role,
      team: (user.metadata?.team as string) || null,
      badge: (user.metadata?.badge as string) || null,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private validatePayload(payload: CreateMemberRequestDTO): void {
    if (!payload.email && !payload.phone) {
      throw new Error('email or phone is required');
    }
    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      throw new Error('invalid email format');
    }
    if (payload.phone && !PHONE_REGEX.test(payload.phone)) {
      throw new Error('invalid phone format');
    }
    if (!payload.name || payload.name.trim().length < 2) {
      throw new Error('name must be at least 2 characters');
    }
    if (!payload.password || payload.password.length < 8) {
      throw new Error('password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(payload.password) || !/[a-z]/.test(payload.password) || !/\d/.test(payload.password)) {
      throw new Error('password must include upper, lower, and number');
    }
    if (!payload.roleId) {
      throw new Error('role is required');
    }
  }
}
