import { IMemberRepository } from '../../../domain/permissions/repositories/IMemberRepository';
import { IRoleRepository } from '../../../domain/permissions/repositories/IRoleRepository';

export class DeleteRoleUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly memberRepository: IMemberRepository,
  ) {}

  async execute(roleKey: string): Promise<void> {
    const role = await this.roleRepository.findByKey(roleKey);
    if (!role) {
      throw new Error('role not found');
    }
    if (role.isSystem) {
      throw new Error('system role cannot be deleted');
    }
    const users = await this.memberRepository.list();
    if (users.some((user) => user.roleId === roleKey)) {
      throw new Error('role is assigned to members');
    }
    await this.roleRepository.deleteById(role.id);
  }
}
