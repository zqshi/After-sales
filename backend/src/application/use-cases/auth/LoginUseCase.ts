import { UserRepository } from '../../../infrastructure/repositories/UserRepository';
import { LoginRequestDTO } from '../../dto/auth/LoginRequestDTO';
import { verifyPassword } from '../../../infrastructure/security/passwordHasher';
import { UserResponseDTO } from '../../dto/auth/UserResponseDTO';

export class LoginUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(payload: LoginRequestDTO): Promise<UserResponseDTO> {
    if (!payload.identifier || !payload.password) {
      throw new Error('identifier and password are required');
    }

    const user = await this.userRepository.findByEmailOrPhone(payload.identifier);
    if (!user) {
      throw new Error('invalid credentials');
    }
    if (user.status !== 'active') {
      throw new Error('account disabled');
    }

    const isValid = verifyPassword(
      payload.password,
      user.passwordSalt,
      user.passwordHash,
      user.passwordIterations,
    );

    if (!isValid) {
      throw new Error('invalid credentials');
    }

    await this.userRepository.updateLastLogin(user.id, new Date());

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
}
