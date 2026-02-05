/**
 * TaskStartedEventHandler - 任务开始事件处理器
 */
import { showNotification } from '../../../core/notifications.js';

export class TaskStartedEventHandler {
  async handle(event) {
    console.log('[TaskStartedEventHandler] 任务开始', event);
    showNotification(`任务 ${event.taskId} 已开始执行`, 'info');
    document.dispatchEvent(new CustomEvent('task-started', { detail: event }));
  }
}
