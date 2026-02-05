import { describe, expect, it } from 'vitest';
import { getRolePermissions, hasPermissions, listAllPermissions } from '@config/permissions';

describe('permissions config', () => {
  it('returns empty for unknown role', () => {
    expect(getRolePermissions(undefined)).toEqual([]);
    expect(getRolePermissions('missing')).toEqual([]);
  });

  it('grants all to admin', () => {
    const all = listAllPermissions();
    expect(hasPermissions('admin', ['customers.read'])).toBe(true);
    expect(hasPermissions('admin', all)).toBe(true);
  });

  it('checks required permissions list', () => {
    expect(hasPermissions('agent', [])).toBe(true);
    expect(hasPermissions('agent', ['tasks.complete'])).toBe(false);
    expect(hasPermissions('manager', ['tasks.complete'])).toBe(true);
  });
});
