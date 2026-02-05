import { describe, expect, it, vi } from 'vitest';
import { TransactionManager } from '@infrastructure/database/TransactionManager';

describe('TransactionManager', () => {
  it('commits transaction on success', async () => {
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: { id: 'mgr' },
    };
    const dataSource = { createQueryRunner: vi.fn().mockReturnValue(queryRunner) };
    const manager = new TransactionManager(dataSource as any);

    const result = await manager.runInTransaction(async (mgr) => {
      return mgr.id;
    });

    expect(result).toBe('mgr');
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('rolls back transaction on failure', async () => {
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: { id: 'mgr' },
    };
    const dataSource = { createQueryRunner: vi.fn().mockReturnValue(queryRunner) };
    const manager = new TransactionManager(dataSource as any);

    await expect(
      manager.runInTransaction(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('supports isolation level', async () => {
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: {},
    };
    const dataSource = { createQueryRunner: vi.fn().mockReturnValue(queryRunner) };
    const manager = new TransactionManager(dataSource as any);

    await manager.runInTransactionWithIsolation('READ COMMITTED', async () => 'ok');

    expect(queryRunner.startTransaction).toHaveBeenCalledWith('READ COMMITTED');
  });
});
