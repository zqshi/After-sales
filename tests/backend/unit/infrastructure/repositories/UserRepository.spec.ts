import { describe, expect, it, vi } from 'vitest';
import { UserRepository } from '@infrastructure/repositories/UserRepository';

const makeRepo = () => ({
  findOne: vi.fn(),
  create: vi.fn((input) => ({ ...input })),
  save: vi.fn(async (entity) => entity),
  find: vi.fn().mockResolvedValue([{ id: 'u1' }]),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe('UserRepository', () => {
  it('finds by id/email/phone', async () => {
    const repo = makeRepo();
    repo.findOne
      .mockResolvedValueOnce({ id: 'u1' })
      .mockResolvedValueOnce({ id: 'u2' })
      .mockResolvedValueOnce({ id: 'u3' });

    const dataSource = { getRepository: vi.fn().mockReturnValue(repo) };
    const userRepo = new UserRepository(dataSource as any);

    expect(await userRepo.findById('u1')).toEqual({ id: 'u1' });
    expect(await userRepo.findByEmail('a@b.com')).toEqual({ id: 'u2' });
    expect(await userRepo.findByPhone('123')).toEqual({ id: 'u3' });
  });

  it('finds by email or phone', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValueOnce({ id: 'u1' });
    const dataSource = { getRepository: vi.fn().mockReturnValue(repo) };
    const userRepo = new UserRepository(dataSource as any);

    const foundByEmail = await userRepo.findByEmailOrPhone('a@b.com');
    expect(foundByEmail?.id).toBe('u1');

    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u2' });
    const foundByPhone = await userRepo.findByEmailOrPhone('123');
    expect(foundByPhone?.id).toBe('u2');
  });

  it('creates, lists, updates and deletes', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValue({ id: 'u1', name: 'new' });
    const dataSource = { getRepository: vi.fn().mockReturnValue(repo) };
    const userRepo = new UserRepository(dataSource as any);

    const created = await userRepo.create({ email: 'a@b.com' });
    expect(created.email).toBe('a@b.com');

    const list = await userRepo.list();
    expect(list.length).toBe(1);

    const updated = await userRepo.updateById('u1', { name: 'new' });
    expect(updated?.name).toBe('new');

    await userRepo.updateLastLogin('u1', new Date('2024-01-01T00:00:00Z'));
    await userRepo.deleteById('u1');

    expect(repo.update).toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith({ id: 'u1' });
  });
});
