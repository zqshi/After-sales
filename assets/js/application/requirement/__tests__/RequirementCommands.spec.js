import { describe, it, expect } from 'vitest';
import { CreateRequirementCommand } from '../commands/CreateRequirementCommand.js';
import { GetRequirementListQuery } from '../queries/GetRequirementListQuery.js';


describe('Requirement commands and queries', () => {
  it('CreateRequirementCommand validates content and confidence', () => {
    expect(() => new CreateRequirementCommand({ content: '' })).toThrow('content');
    expect(() => new CreateRequirementCommand({ content: 'x', confidence: 2 })).toThrow('confidence');
  });

  it('CreateRequirementCommand sets defaults', () => {
    const cmd = new CreateRequirementCommand({ content: 'Need export' });
    expect(cmd.source).toBe('manual');
    expect(cmd.priority).toBe('medium');
  });

  it('GetRequirementListQuery defaults', () => {
    const q = new GetRequirementListQuery({});
    expect(q.status).toBe('all');
    expect(q.source).toBe('all');
  });
});
