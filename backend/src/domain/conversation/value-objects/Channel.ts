import { ValueObject } from '@domain/shared/ValueObject';

const ALLOWED_CHANNELS = ['chat', 'email', 'phone', 'web', 'sms', 'voice'] as const;
export type ChannelType = (typeof ALLOWED_CHANNELS)[number];

export class Channel extends ValueObject<{ value: ChannelType }> {
  private constructor(value: ChannelType) {
    super({ value });
  }

  static fromString(value: string): Channel {
    const normalized = value.trim().toLowerCase();
    if (!ALLOWED_CHANNELS.includes(normalized as ChannelType)) {
      throw new Error(`Unsupported channel: ${value}`);
    }

    return new Channel(normalized as ChannelType);
  }

  get value(): ChannelType {
    return this.props.value;
  }

  toJSON(): string {
    return this.value;
  }
}
