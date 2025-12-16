import { ValueObject } from '@domain/shared/ValueObject';

interface ContactInfoProps {
  email?: string;
  phone?: string;
  address?: string;
  preferredChannel?: 'email' | 'phone' | 'chat';
}

export class ContactInfo extends ValueObject<ContactInfoProps> {
  private constructor(props: ContactInfoProps) {
    super(props);
  }

  static create(data: ContactInfoProps): ContactInfo {
    return new ContactInfo({
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      preferredChannel: data.preferredChannel,
    });
  }

  get email(): string | undefined {
    return this.props.email;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  get address(): string | undefined {
    return this.props.address;
  }

  get preferredChannel(): ContactInfoProps['preferredChannel'] {
    return this.props.preferredChannel;
  }
}
