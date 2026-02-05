import { describe, it, expect, vi } from 'vitest';
import { AiAnalysisCache } from '../AiAnalysisCache.js';

describe('AiAnalysisCache', () => {
  it('stores and retrieves data', () => {
    const cache = new AiAnalysisCache(2, 1000);
    cache.set('c1', { ok: true });
    expect(cache.get('c1')).toEqual({ ok: true });
    expect(cache.size()).toBe(1);
    expect(cache.has('c1')).toBe(true);
  });

  it('evicts oldest when max size reached', () => {
    const cache = new AiAnalysisCache(2, 1000);
    cache.set('c1', 1);
    cache.set('c2', 2);
    cache.set('c3', 3);
    expect(cache.get('c1')).toBeNull();
    expect(cache.get('c2')).toBe(2);
    expect(cache.get('c3')).toBe(3);
  });

  it('expires entries after maxAge', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const cache = new AiAnalysisCache(2, 1000);
    cache.set('c1', { ok: true });

    vi.spyOn(Date, 'now').mockImplementation(() => now + 1500);
    expect(cache.get('c1')).toBeNull();
    expect(cache.has('c1')).toBe(false);
  });

  it('clears and deletes', () => {
    const cache = new AiAnalysisCache(2, 1000);
    cache.set('c1', { ok: true });
    cache.delete('c1');
    expect(cache.has('c1')).toBe(false);
    cache.set('c2', { ok: true });
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
