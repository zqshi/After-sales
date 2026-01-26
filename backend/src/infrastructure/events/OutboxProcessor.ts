import { DataSource } from 'typeorm';
import { OutboxEventBus } from './OutboxEventBus';
import { EventBus } from './EventBus';
import { DomainEvent } from '@domain/shared/DomainEvent';

/**
 * OutboxProcessor - Outbox事件处理器
 *
 * 职责:
 * 1. 定期轮询outbox_events表
 * 2. 获取pending状态的事件
 * 3. 发布事件到内存EventBus
 * 4. 更新事件状态（published/failed）
 * 5. 处理重试逻辑和死信队列
 */
export class OutboxProcessor {
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private processingBatch: boolean = false;

  constructor(
    private readonly outboxEventBus: OutboxEventBus,
    private readonly eventBus: EventBus,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 启动处理器
   *
   * @param intervalMs 轮询间隔（毫秒），默认5秒
   */
  start(intervalMs: number = 5000): void {
    if (this.isRunning) {
      console.warn('[OutboxProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[OutboxProcessor] Started with interval ${intervalMs}ms`);

    // 立即处理一次
    this.processBatch().catch((error) => {
      console.error('[OutboxProcessor] Initial batch processing error:', error);
    });

    // 定期轮询
    this.intervalId = setInterval(() => {
      if (!this.processingBatch) {
        this.processBatch().catch((error) => {
          console.error('[OutboxProcessor] Batch processing error:', error);
        });
      }
    }, intervalMs);
  }

  /**
   * 停止处理器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('[OutboxProcessor] Stopped');
  }

  /**
   * 处理一批事件
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch) {
      return;
    }

    this.processingBatch = true;

    try {
      // 获取待处理的事件（批次大小100）
      const pendingEvents = await this.outboxEventBus.getPendingEvents(100);

      if (pendingEvents.length === 0) {
        return;
      }

      console.log(
        `[OutboxProcessor] Processing ${pendingEvents.length} events`,
      );

      // 并发处理事件（限制并发数为10）
      const concurrencyLimit = 10;
      for (let i = 0; i < pendingEvents.length; i += concurrencyLimit) {
        const batch = pendingEvents.slice(i, i + concurrencyLimit);
        await Promise.all(batch.map((event) => this.processEvent(event)));
      }

      console.log(
        `[OutboxProcessor] Completed processing ${pendingEvents.length} events`,
      );
    } catch (error) {
      console.error('[OutboxProcessor] Batch processing failed:', error);
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * 处理单个事件
   */
  private async processEvent(outboxEvent: any): Promise<void> {
    try {
      // 重建领域事件对象
      const domainEvent = this.reconstructDomainEvent(outboxEvent);

      // 发布到内存EventBus
      await this.eventBus.publish(domainEvent);

      // 标记为已发布
      await this.outboxEventBus.markAsPublished(outboxEvent.id);

      console.log(
        `[OutboxProcessor] Successfully published event: ${outboxEvent.eventType} (${outboxEvent.id})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(
        `[OutboxProcessor] Failed to process event ${outboxEvent.id}:`,
        errorMessage,
      );

      // 标记为失败，并增加重试计数
      await this.outboxEventBus.markAsFailed(outboxEvent.id, errorMessage);

      // 检查是否进入死信队列
      if (outboxEvent.retryCount + 1 >= outboxEvent.maxRetries) {
        console.warn(
          `[OutboxProcessor] Event ${outboxEvent.id} moved to dead letter queue`,
        );
        // 可以在这里触发告警
        await this.sendDeadLetterAlert(outboxEvent, errorMessage);
      }
    }
  }

  /**
   * 重建领域事件对象
   */
  private reconstructDomainEvent(outboxEvent: any): DomainEvent<object> {
    // 创建一个匿名的DomainEvent子类
    return {
      eventId: outboxEvent.id,
      eventType: outboxEvent.eventType,
      aggregateId: outboxEvent.aggregateId,
      occurredAt: outboxEvent.occurredAt,
      occurredOn: outboxEvent.occurredAt,
      version: outboxEvent.version,
      payload: outboxEvent.eventData,
    } as DomainEvent<object>;
  }

  /**
   * 发送死信队列告警
   */
  private async sendDeadLetterAlert(
    outboxEvent: any,
    errorMessage: string,
  ): Promise<void> {
    const alertMessage = `[ALERT] Dead Letter Event Detected:
      Event ID: ${outboxEvent.id}
      Event Type: ${outboxEvent.eventType}
      Aggregate ID: ${outboxEvent.aggregateId}
      Aggregate Type: ${outboxEvent.aggregateType}
      Error: ${errorMessage}
      Retry Count: ${outboxEvent.retryCount}
      Created At: ${outboxEvent.createdAt}
      Last Retry At: ${outboxEvent.lastRetryAt}`;

    // 1. 控制台告警（始终输出）
    console.error(alertMessage);

    // 2. Webhook 告警（如果配置了）
    const webhookUrl = process.env.DEAD_LETTER_ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            msgtype: 'text',
            text: {
              content: alertMessage,
            },
            // 兼容钉钉格式
            at: {
              isAtAll: false,
            },
          }),
        });

        if (!response.ok) {
          console.error('[OutboxProcessor] 发送死信队列告警失败:', response.statusText);
        }
      } catch (error) {
        console.error('[OutboxProcessor] 发送死信队列告警异常:', error);
      }
    }

    // 3. 邮件告警（如果配置了）
    const alertEmail = process.env.DEAD_LETTER_ALERT_EMAIL;
    if (alertEmail) {
      // TODO: 集成邮件服务（如 SendGrid、AWS SES 等）
      console.warn('[OutboxProcessor] 邮件告警未实现，请配置邮件服务');
    }
  }

  /**
   * 手动触发处理
   */
  async processNow(): Promise<void> {
    await this.processBatch();
  }

  /**
   * 获取处理器状态
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
  } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.processingBatch,
    };
  }
}
