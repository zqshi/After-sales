import { describe, expect, it } from 'vitest';
import { RequirementDetectorService } from '@domain/requirement/services/RequirementDetectorService';

describe('RequirementDetectorService', () => {
  const detector = new RequirementDetectorService();

  it('recognizes finance related keywords', () => {
    const result = detector.detect('customer requested refund twice');
    expect(result.category).toBe('finance');
    expect(result.priority).toBe('high');
    expect(result.source).toBe('conversation');
  });

  it('defaults to general when no keyword applies', () => {
    const result = detector.detect('we have a vague idea for improvement');
    expect(result.category).toBe('general');
    expect(result.priority).toBe('medium');
  });
});
