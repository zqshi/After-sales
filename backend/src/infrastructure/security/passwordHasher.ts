import crypto from 'crypto';

const DEFAULT_ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export interface PasswordHashResult {
  hash: string;
  salt: string;
  iterations: number;
  algorithm: string;
}

export function hashPassword(
  password: string,
  salt: string = crypto.randomBytes(16).toString('hex'),
  iterations: number = DEFAULT_ITERATIONS,
): PasswordHashResult {
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString('hex');

  return {
    hash,
    salt,
    iterations,
    algorithm: `pbkdf2-${DIGEST}`,
  };
}

export function verifyPassword(
  password: string,
  salt: string,
  hash: string,
  iterations: number,
): boolean {
  const computed = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString('hex');

  const computedBuffer = Buffer.from(computed, 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');
  if (computedBuffer.length !== hashBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(computedBuffer, hashBuffer);
}
