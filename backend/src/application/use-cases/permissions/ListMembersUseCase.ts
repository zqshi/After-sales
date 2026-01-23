import { UserRepository } from '../../../infrastructure/repositories/UserRepository';
import { MemberResponseDTO } from '../../dto/permissions/MemberResponseDTO';

export class ListMembersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<MemberResponseDTO[]> {
    const users = await this.userRepository.list();

    return users.map((user) => ({
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
    }));
  }
}
