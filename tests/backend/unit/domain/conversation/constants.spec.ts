import { describe, expect, it } from 'vitest';
import { isImChannel } from '@domain/conversation/constants';

describe('conversation constants', () => {
  it('detects im channels', () => {
    expect(isImChannel('wecom')).toBe(true);
    expect(isImChannel(' WEB ')).toBe(true);
    expect(isImChannel('email')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(isImChannel(undefined)).toBe(false);
  });
});
