export const IM_CHANNELS = new Set([
  'wecom',
  'feishu',
  'dingtalk',
  'web',
  'chat',
  'wechat',
  'qq',
]);

export function isImChannel(channel?: string): boolean {
  if (!channel) {
    return false;
  }
  return IM_CHANNELS.has(channel.trim().toLowerCase());
}
