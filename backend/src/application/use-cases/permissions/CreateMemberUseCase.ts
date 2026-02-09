import { randomUUID } from 'crypto';

import { hashPassword } from '../../../infrastructure/security/passwordHasher';
import { PermissionMemberError, PermissionMemberErrorCode } from '../../errors/PermissionMemberError';
import { CreateMemberRequestDTO } from '../../dto/permissions/MemberRequestDTO';
import { MemberResponseDTO } from '../../dto/permissions/MemberResponseDTO';
import { IMemberRepository } from '../../../domain/permissions/repositories/IMemberRepository';
import { IRoleRepository } from '../../../domain/permissions/repositories/IRoleRepository';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z0-9\u4e00-\u9fa5 .-]+$/;

export class CreateMemberUseCase {
  constructor(
    private readonly memberRepository: IMemberRepository,
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(payload: CreateMemberRequestDTO): Promise<MemberResponseDTO> {
    this.validatePayload(payload);

    const existing = await this.memberRepository.findByEmail(payload.email);
    if (existing) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.EMAIL_DUPLICATE,
        'email already exists',
      );
    }

    const role = await this.roleRepository.findByKey(payload.roleId);
    if (!role) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.ROLE_NOT_FOUND,
        'role not found',
      );
    }

    await this.validateSsoDirectory(payload.email);

    const password = hashPassword(randomUUID());

    const user = await this.memberRepository.create({
      id: randomUUID(),
      email: payload.email,
      name: payload.name.trim(),
      roleId: role.key,
      status: 'active',
      auth: {
        passwordHash: password.hash,
        passwordSalt: password.salt,
        passwordIterations: password.iterations,
        passwordAlgo: password.algorithm,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email ?? '',
      roleId: user.roleId,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private validatePayload(payload: CreateMemberRequestDTO): void {
    if (!payload.name || !payload.name.trim()) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.NAME_REQUIRED,
        'name is required',
      );
    }
    const trimmedName = payload.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.NAME_INVALID,
        'name length is invalid',
      );
    }
    if (!NAME_REGEX.test(trimmedName)) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.NAME_ILLEGAL,
        'name contains illegal characters',
      );
    }
    if (!payload.email || !payload.email.trim()) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.EMAIL_REQUIRED,
        'email is required',
      );
    }
    if (!EMAIL_REGEX.test(payload.email)) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.EMAIL_INVALID,
        'invalid email format',
      );
    }
    if (!this.isCompanyEmail(payload.email)) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.EMAIL_DOMAIN_MISMATCH,
        'email domain mismatch',
      );
    }
    if (!payload.roleId) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.ROLE_REQUIRED,
        'role is required',
      );
    }
  }

  private isCompanyEmail(email: string): boolean {
    const allowed = process.env.COMPANY_EMAIL_DOMAINS?.split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed || allowed.length === 0) {
      return false;
    }
    const domain = email.split('@')[1]?.toLowerCase() || '';
    return allowed.includes(domain);
  }

  private async validateSsoDirectory(email: string): Promise<void> {
    const mode = (process.env.SSO_LOOKUP_MODE || 'disabled').toLowerCase();
    if (mode !== 'required') {
      return;
    }
    const endpoint = process.env.SSO_DIRECTORY_LOOKUP_URL;
    if (!endpoint) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.SSO_LOOKUP_FAILED,
        'sso directory not configured',
      );
    }
    try {
      const response = await fetch(`${endpoint}?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SSO_DIRECTORY_TOKEN
            ? { Authorization: `Bearer ${process.env.SSO_DIRECTORY_TOKEN}` }
            : {}),
        },
      });
      if (!response.ok) {
        throw new PermissionMemberError(
          PermissionMemberErrorCode.SSO_LOOKUP_FAILED,
          'sso lookup failed',
        );
      }
      const payload = await response.json() as { exists?: boolean };
      if (!payload.exists) {
        throw new PermissionMemberError(
          PermissionMemberErrorCode.SSO_NOT_FOUND,
          'email not found in sso directory',
        );
      }
    } catch (error) {
      if (error instanceof PermissionMemberError) {
        throw error;
      }
      throw new PermissionMemberError(
        PermissionMemberErrorCode.SSO_LOOKUP_FAILED,
        'sso lookup failed',
      );
    }
  }
}
