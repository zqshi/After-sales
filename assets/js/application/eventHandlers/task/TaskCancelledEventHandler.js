/**
 * TaskCancelledEventHandler - 任务取消事件处理器
 */
import { showNotification } from '../../../core/notifications.js';

export class TaskCancelledEventHandler {
  async handle(event) {
    console.log('[TaskCancelledEventHandler] 任务取消', event);
    showNotification(`任务 ${event.taskId} 已取消`, 'warning');
    document.dispatchEvent(new CustomEvent('task-cancelled', { detail: event }));
  }
}
