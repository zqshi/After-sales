import { describe, expect, it } from 'vitest';
import { ValueObject } from '@domain/shared/ValueObject';

class Foo extends ValueObject<{ a: number }> {
  constructor(a: number) {
    super({ a });
  }
}

class Bar extends ValueObject<{ a: number }> {
  constructor(a: number) {
    super({ a });
  }
}

describe('ValueObject', () => {
  it('returns false for null', () => {
    const foo = new Foo(1);
    expect(foo.equals(null as any)).toBe(false);
  });

  it('returns false for different type', () => {
    const foo = new Foo(1);
    const bar = new Bar(1);
    expect(foo.equals(bar)).toBe(false);
  });

  it('returns true for same props', () => {
    const foo = new Foo(1);
    const foo2 = new Foo(1);
    expect(foo.equals(foo2)).toBe(true);
  });
});
