/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console */
import { AppDataSource } from '../database/data-source';

import { EventBus } from './EventBus';
import { OutboxEventBus } from './OutboxEventBus';
import { OutboxProcessor } from './OutboxProcessor';

/**
 * Outbox模式集成说明
 *
 * 在应用启动时，需要：
 * 1. 创建OutboxEventBus实例
 * 2. 创建内存EventBus实例并订阅事件处理器
 * 3. 创建OutboxProcessor实例
 * 4. 启动OutboxProcessor
 */

/**
 * 初始化Outbox处理器
 */
export async function initializeOutboxProcessor(): Promise<OutboxProcessor> {
  // 确保数据库连接已建立
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // 创建OutboxEventBus
  const outboxEventBus = new OutboxEventBus(AppDataSource);

  // 创建内存EventBus（用于事件分发）
  const eventBus = new EventBus();

  // 在这里订阅所有事件处理器
  // 例如:
  // eventBus.subscribe('RequirementCreatedEvent', requirementCreatedHandler);
  // eventBus.subscribe('TaskCompletedEvent', taskCompletedHandler);

  // 创建OutboxProcessor
  const outboxProcessor = new OutboxProcessor(
    outboxEventBus,
    eventBus,
    AppDataSource,
  );

  // 启动处理器（每5秒轮询一次）
  outboxProcessor.start(5000);

  console.log('[Outbox] Processor started successfully');

  return outboxProcessor;
}

/**
 * 优雅关闭
 */
export async function shutdownOutboxProcessor(
  processor: OutboxProcessor,
): Promise<void> {
  processor.stop();
  console.log('[Outbox] Processor stopped');
}

/**
 * 使用示例：在app.ts或server.ts中
 *
 * ```typescript
 * import { initializeOutboxProcessor, shutdownOutboxProcessor } from './outbox-setup';
 *
 * // 启动时
 * const outboxProcessor = await initializeOutboxProcessor();
 *
 * // 优雅关闭
 * process.on('SIGTERM', async () => {
 *   await shutdownOutboxProcessor(outboxProcessor);
 *   await AppDataSource.destroy();
 *   process.exit(0);
 * });
 * ```
 */

/**
 * 运行数据库迁移
 *
 * 在首次部署时，需要运行迁移创建outbox_events表：
 *
 * ```bash
 * npm run typeorm migration:run
 * ```
 *
 * 或者在代码中：
 *
 * ```typescript
 * await AppDataSource.runMigrations();
 * ```
 */

/**
 * 监控和维护
 *
 * 1. 监控死信队列：
 * ```typescript
 * const deadLetterEvents = await outboxEventBus.getDeadLetterEvents();
 * if (deadLetterEvents.length > 0) {
 *   // 发送告警
 * }
 * ```
 *
 * 2. 定期清理已发布事件（建议在cron job中执行）：
 * ```typescript
 * // 清理30天前的已发布事件
 * const deletedCount = await outboxEventBus.cleanupPublishedEvents(30);
 * console.log(`Cleaned up ${deletedCount} published events`);
 * ```
 *
 * 3. 重试死信队列事件（需要人工介入）：
 * ```typescript
 * await outboxEventBus.retryDeadLetterEvent(eventId);
 * ```
 */
