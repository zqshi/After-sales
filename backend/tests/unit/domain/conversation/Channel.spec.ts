import { describe, it, expect } from 'vitest';
import { Channel } from '@domain/conversation/value-objects/Channel';

describe('Channel Value Object', () => {
  it('should create known channels', () => {
    const channel = Channel.fromString('chat');
    expect(channel.value).toBe('chat');
    expect(channel.toJSON()).toBe('chat');
  });

  it('should normalize casing and trimming', () => {
    const channel = Channel.fromString(' Email ');
    expect(channel.value).toBe('email');
  });

  it('should reject unsupported channels', () => {
    expect(() => Channel.fromString('fax')).toThrow('Unsupported channel: fax');
  });
});
