/**
 * TaskCompletedEventHandler - 任务完成事件处理器
 */
import { showNotification } from '../../../core/notifications.js';

export class TaskCompletedEventHandler {
  async handle(event) {
    console.log('[TaskCompletedEventHandler] 任务完成', event);
    showNotification(`任务 ${event.taskId} 已完成，质量评分 ${event.quality || 'N/A'}`, 'success');
    document.dispatchEvent(new CustomEvent('task-completed', { detail: event }));
  }
}
