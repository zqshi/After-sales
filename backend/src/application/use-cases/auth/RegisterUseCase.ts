import { randomUUID } from 'crypto';

import { config } from '../../../config/app.config';
import { UserRepository } from '../../../infrastructure/repositories/UserRepository';
import { hashPassword } from '../../../infrastructure/security/passwordHasher';
import { RegisterRequestDTO } from '../../dto/auth/RegisterRequestDTO';
import { UserResponseDTO } from '../../dto/auth/UserResponseDTO';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export class RegisterUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(payload: RegisterRequestDTO): Promise<UserResponseDTO> {
    if (!config.auth.allowSignup) {
      throw new Error('signup is disabled');
    }

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

    const password = hashPassword(payload.password);

    const user = await this.userRepository.create({
      id: randomUUID(),
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      name: payload.name,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      passwordIterations: password.iterations,
      passwordAlgo: password.algorithm,
      role: config.auth.defaultRole,
      status: 'active',
      metadata: {},
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      metadata: user.metadata,
    };
  }

  private validatePayload(payload: RegisterRequestDTO): void {
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
  }
}
