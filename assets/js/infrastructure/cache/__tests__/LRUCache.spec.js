import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LRUCache } from '../LRUCache.js';

describe('LRUCache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets and gets values, tracks hits/misses', () => {
    const cache = new LRUCache(2);
    expect(cache.get('missing')).toBeNull();
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('evicts least recently used', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('expires entries with ttl', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const cache = new LRUCache(2);
    cache.set('a', 1, 1000);

    vi.spyOn(Date, 'now').mockImplementation(() => now + 1500);
    expect(cache.get('a')).toBeNull();
    expect(cache.has('a')).toBe(false);
  });

  it('cleans up expired entries and enumerates', () => {
    const base = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => base);
    const cache = new LRUCache(3);
    cache.set('a', 1, 10);
    cache.set('b', 2, 1000);
    cache.set('c', 3);

    vi.spyOn(Date, 'now').mockImplementation(() => base + 20);
    expect(cache.cleanup()).toBe(1);
    expect(cache.keys()).toEqual(['b', 'c']);
    expect(cache.values()).toEqual([2, 3]);

    const collected = [];
    cache.forEach((value, key) => collected.push([key, value]));
    expect(collected).toEqual([
      ['b', 2],
      ['c', 3],
    ]);
  });
});
