export type CustomerIdentityType = 'user' | 'group' | 'anon';

export interface NormalizeCustomerIdInput {
  customerId: string;
  channel: string;
  identityType?: CustomerIdentityType;
}

const KNOWN_CHANNELS = new Set([
  'chat',
  'email',
  'phone',
  'web',
  'sms',
  'voice',
  'feishu',
  'wecom',
  'wechat',
  'qq',
  'dingtalk',
]);

/**
 * Normalize customerId for IM channels to avoid cross-channel collisions.
 *
 * Rules:
 * - If customerId already includes a channel prefix (e.g. wecom:user:xxx), keep as-is.
 * - If customerId includes any prefix (has ':'), keep as-is to avoid breaking external IDs.
 * - Otherwise, prefix with "<channel>:<type>:". Default type is "user".
 */
export function normalizeCustomerId({
  customerId,
  channel,
  identityType,
}: NormalizeCustomerIdInput): string {
  if (!customerId) {
    return customerId;
  }

  if (customerId.includes(':')) {
    return customerId;
  }

  const normalizedChannel = channel?.toLowerCase() || 'unknown';
  const type = identityType || 'user';

  if (!KNOWN_CHANNELS.has(normalizedChannel)) {
    return `${normalizedChannel}:${type}:${customerId}`;
  }

  return `${normalizedChannel}:${type}:${customerId}`;
}
