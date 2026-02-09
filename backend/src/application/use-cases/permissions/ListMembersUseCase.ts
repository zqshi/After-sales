import { MemberResponseDTO } from '../../dto/permissions/MemberResponseDTO';
import { IMemberRepository } from '../../../domain/permissions/repositories/IMemberRepository';

export class ListMembersUseCase {
  constructor(private readonly memberRepository: IMemberRepository) {}

  async execute(): Promise<MemberResponseDTO[]> {
    const users = await this.memberRepository.list();

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? '',
      roleId: user.roleId,
      status: user.status,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    }));
  }
}
