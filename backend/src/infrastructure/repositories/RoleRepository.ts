import { DataSource, Repository } from 'typeorm';

import { RoleEntity } from '@infrastructure/database/entities/RoleEntity';

export class RoleRepository {
  private repository: Repository<RoleEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(RoleEntity);
  }

  async list(): Promise<RoleEntity[]> {
    return await this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByKey(key: string): Promise<RoleEntity | null> {
    return await this.repository.findOne({ where: { key } });
  }

  async create(role: Partial<RoleEntity>): Promise<RoleEntity> {
    const entity = this.repository.create(role);
    return await this.repository.save(entity);
  }

  async updateById(id: string, updates: Partial<RoleEntity>): Promise<RoleEntity | null> {
    await this.repository.update({ id }, updates);
    return this.findById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
