import { UserRepository } from '../../../infrastructure/repositories/UserRepository';

export class DeleteMemberUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(memberId: string): Promise<void> {
    const user = await this.userRepository.findById(memberId);
    if (!user) {
      throw new Error('member not found');
    }
    await this.userRepository.deleteById(memberId);
  }
}
