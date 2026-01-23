import { UserRepository } from '../../../infrastructure/repositories/UserRepository';
import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';
import { UpdateMemberRequestDTO } from '../../dto/permissions/MemberRequestDTO';
import { MemberResponseDTO } from '../../dto/permissions/MemberResponseDTO';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export class UpdateMemberUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(memberId: string, payload: UpdateMemberRequestDTO): Promise<MemberResponseDTO> {
    const user = await this.userRepository.findById(memberId);
    if (!user) {
      throw new Error('member not found');
    }

    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      throw new Error('invalid email format');
    }
    if (payload.phone && !PHONE_REGEX.test(payload.phone)) {
      throw new Error('invalid phone format');
    }

    if (payload.email && payload.email !== user.email) {
      const existing = await this.userRepository.findByEmail(payload.email);
      if (existing) {
        throw new Error('email already exists');
      }
    }
    if (payload.phone && payload.phone !== user.phone) {
      const existing = await this.userRepository.findByPhone(payload.phone);
      if (existing) {
        throw new Error('phone already exists');
      }
    }

    let roleKey = user.role;
    if (payload.roleId) {
      const role = await this.roleRepository.findByKey(payload.roleId);
      if (!role) {
        throw new Error('role not found');
      }
      roleKey = role.key;
    }

    const metadata = {
      ...(user.metadata || {}),
      team: payload.team !== undefined ? payload.team?.trim() || null : user.metadata?.team ?? null,
      badge: payload.badge !== undefined ? payload.badge?.trim() || null : user.metadata?.badge ?? null,
    };

    const updated = await this.userRepository.updateById(memberId, {
      name: payload.name ? payload.name.trim() : user.name,
      email: payload.email !== undefined ? payload.email : user.email,
      phone: payload.phone !== undefined ? payload.phone : user.phone,
      role: roleKey,
      status: payload.status ?? user.status,
      metadata,
    });

    if (!updated) {
      throw new Error('member not found');
    }

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      roleId: updated.role,
      team: (updated.metadata?.team as string) || null,
      badge: (updated.metadata?.badge as string) || null,
      status: updated.status,
      lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
