import { describe, it, expect } from 'vitest';
import { Specification, ExpressionSpecification } from '@domain/shared/Specification';

class AlwaysTrueSpec extends Specification<number> {
  isSatisfiedBy(): boolean {
    return true;
  }
}
class AlwaysFalseSpec extends Specification<number> {
  isSatisfiedBy(): boolean {
    return false;
  }
}

describe('Specification', () => {
  it('combines and/or/not', () => {
    const t = new AlwaysTrueSpec();
    const f = new AlwaysFalseSpec();

    expect(t.and(t).isSatisfiedBy(1)).toBe(true);
    expect(t.and(f).isSatisfiedBy(1)).toBe(false);
    expect(t.or(f).isSatisfiedBy(1)).toBe(true);
    expect(f.or(f).isSatisfiedBy(1)).toBe(false);
    expect(f.not().isSatisfiedBy(1)).toBe(true);
  });

  it('supports expression specification', () => {
    const spec = new ExpressionSpecification<number>((n) => n > 3);
    expect(spec.isSatisfiedBy(5)).toBe(true);
    expect(spec.isSatisfiedBy(2)).toBe(false);
  });
});
