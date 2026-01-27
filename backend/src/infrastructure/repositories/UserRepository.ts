import { DataSource, Repository } from 'typeorm';

import { UserEntity } from '@infrastructure/database/entities/UserEntity';

export class UserRepository {
  private repository: Repository<UserEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserEntity);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return await this.repository.findOne({ where: { phone } });
  }

  async findByEmailOrPhone(identifier: string): Promise<UserEntity | null> {
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) {
      return byEmail;
    }
    return await this.findByPhone(identifier);
  }

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repository.create(user);
    return await this.repository.save(entity);
  }

  async list(): Promise<UserEntity[]> {
    return await this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async updateById(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    await this.repository.update({ id }, updates as any);
    return this.findById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async updateLastLogin(id: string, when: Date): Promise<void> {
    await this.repository.update({ id }, { lastLoginAt: when });
  }
}
