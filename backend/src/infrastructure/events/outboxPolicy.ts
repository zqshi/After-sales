import { config } from '@config/app.config';

export type OutboxPublishMode = 'dual' | 'outbox_only' | 'direct_only';

export function shouldPublishDirectly(): boolean {
  if (!config.outbox.enabled) {
    return true;
  }
  return config.outbox.publishMode !== 'outbox_only';
}
