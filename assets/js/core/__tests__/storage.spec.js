import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setItem, getItem, removeItem, clear, getStorageInfo } from '../storage.js';

const createMockStorage = () => {
  const storage = {};
  Object.defineProperty(storage, 'length', {
    configurable: true,
    enumerable: false,
    get() {
      return Object.keys(storage).length;
    },
  });
  Object.defineProperty(storage, 'key', {
    configurable: true,
    enumerable: false,
    value(index) {
      return Object.keys(storage)[index] || null;
    },
  });
  Object.defineProperty(storage, 'getItem', {
    configurable: true,
    enumerable: false,
    value(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
  });
  Object.defineProperty(storage, 'setItem', {
    configurable: true,
    enumerable: false,
    value(key, value) {
      storage[key] = String(value);
    },
  });
  Object.defineProperty(storage, 'removeItem', {
    configurable: true,
    enumerable: false,
    value(key) {
      delete storage[key];
    },
  });
  Object.defineProperty(storage, 'clear', {
    configurable: true,
    enumerable: false,
    value() {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
  });
  return storage;
};

describe('storage', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets and gets values', () => {
    expect(setItem('k1', { a: 1 })).toBe(true);
    expect(getItem('k1')).toEqual({ a: 1 });
    expect(getItem('missing', 'default')).toBe('default');
  });

  it('handles invalid json', () => {
    localStorage.setItem('bad', '{not-json');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getItem('bad', 'fallback')).toBe('fallback');
    expect(spy).toHaveBeenCalled();
  });

  it('removes and clears items', () => {
    setItem('k1', { a: 1 });
    expect(removeItem('k1')).toBe(true);
    setItem('k2', { b: 2 });
    expect(clear()).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('returns storage info', () => {
    setItem('k1', { a: 1 });
    const info = getStorageInfo();
    expect(info.available).toBe(true);
    expect(Number(info.size)).toBeGreaterThan(0);
    expect(info.itemCount).toBeGreaterThan(0);
  });

  it('handles unavailable storage', () => {
    const setSpy = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(setItem('k1', { a: 1 })).toBe(false);
    expect(getItem('k1', 'fallback')).toBe('fallback');
    expect(removeItem('k1')).toBe(false);
    expect(clear()).toBe(false);

    setSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs quota warning when quota exceeded', () => {
    const error = new Error('quota');
    error.name = 'QuotaExceededError';

    const setSpy = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw error;
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(setItem('k1', { a: 1 })).toBe(false);
    expect(warnSpy).toHaveBeenCalled();

    setSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
