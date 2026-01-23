import { RoleRepository } from '../../../infrastructure/repositories/RoleRepository';
import { UserRepository } from '../../../infrastructure/repositories/UserRepository';

export class DeleteRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(roleKey: string): Promise<void> {
    const role = await this.roleRepository.findByKey(roleKey);
    if (!role) {
      throw new Error('role not found');
    }
    if (role.isSystem) {
      throw new Error('system role cannot be deleted');
    }
    const users = await this.userRepository.list();
    if (users.some((user) => user.role === roleKey)) {
      throw new Error('role is assigned to members');
    }
    await this.roleRepository.deleteById(role.id);
  }
}
