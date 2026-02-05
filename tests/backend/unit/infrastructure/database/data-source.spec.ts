import { describe, expect, it } from 'vitest';
import { AppDataSource } from '@infrastructure/database/data-source';
import { config } from '@config/app.config';

describe('AppDataSource', () => {
  it('uses config values', () => {
    const options = AppDataSource.options as any;
    expect(options.type).toBe('postgres');
    expect(options.host).toBe(config.database.host);
    expect(options.port).toBe(config.database.port);
    expect(options.username).toBe(config.database.user);
    expect(options.database).toBe(config.database.name);
  });
});
