import { PermissionMemberError, PermissionMemberErrorCode } from '../../errors/PermissionMemberError';
import { IMemberRepository } from '../../../domain/permissions/repositories/IMemberRepository';

export class DeleteMemberUseCase {
  constructor(private readonly memberRepository: IMemberRepository) {}

  async execute(memberId: string): Promise<void> {
    const user = await this.memberRepository.findById(memberId);
    if (!user) {
      throw new PermissionMemberError(
        PermissionMemberErrorCode.MEMBER_NOT_FOUND,
        'member not found',
      );
    }
    await this.memberRepository.deleteById(memberId);
  }
}
