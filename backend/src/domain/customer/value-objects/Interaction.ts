import { ValueObject } from '@domain/shared/ValueObject';

export type InteractionType = 'call' | 'chat' | 'email' | 'meeting';

interface InteractionProps {
  interactionType: InteractionType;
  occurredAt: Date;
  notes?: string;
  channel?: string;
}

export class Interaction extends ValueObject<InteractionProps> {
  private constructor(props: InteractionProps) {
    super(props);
  }

  static create(data: InteractionProps): Interaction {
    return new Interaction({
      interactionType: data.interactionType,
      occurredAt: data.occurredAt,
      notes: data.notes?.trim(),
      channel: data.channel,
    });
  }

  get interactionType(): InteractionType {
    return this.props.interactionType;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get channel(): string | undefined {
    return this.props.channel;
  }
}
