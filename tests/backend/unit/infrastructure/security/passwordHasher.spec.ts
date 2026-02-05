import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@infrastructure/security/passwordHasher';

describe('passwordHasher', () => {
  it('hashes and verifies passwords', () => {
    const result = hashPassword('secret', 'salt', 1000);
    expect(result.hash).toBeTruthy();
    expect(result.salt).toBe('salt');
    expect(result.algorithm).toContain('pbkdf2');

    const ok = verifyPassword('secret', result.salt, result.hash, result.iterations);
    expect(ok).toBe(true);
  });

  it('returns false on mismatched hash', () => {
    const result = hashPassword('secret', 'salt', 1000);
    const ok = verifyPassword('secret', 'other', result.hash, result.iterations);
    expect(ok).toBe(false);
  });
});
