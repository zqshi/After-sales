import { describe, it, expect } from 'vitest';
import { AddServiceRecordCommand } from '../commands/AddServiceRecordCommand.js';
import { RefreshProfileCommand } from '../commands/RefreshProfileCommand.js';
import { GetProfileQuery } from '../queries/GetProfileQuery.js';


describe('Customer commands and queries', () => {
  it('AddServiceRecordCommand validates required fields', () => {
    expect(() => new AddServiceRecordCommand({})).toThrow('customerId');
    expect(() => new AddServiceRecordCommand({ customerId: 'c1' })).toThrow('title');
  });

  it('RefreshProfileCommand validates required fields', () => {
    expect(() => new RefreshProfileCommand({})).toThrow('customerId');
  });

  it('GetProfileQuery defaults flags', () => {
    const query = new GetProfileQuery({ customerId: 'c1' });
    expect(query.includeHistory).toBe(true);
    expect(query.includeInsights).toBe(true);
  });
});
