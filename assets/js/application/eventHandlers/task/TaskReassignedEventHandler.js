/**
 * TaskReassignedEventHandler - 任务重新分配事件处理器
 */
import { showNotification } from '../../../core/notifications.js';

export class TaskReassignedEventHandler {
  async handle(event) {
    console.info('[TaskReassignedEventHandler] 任务重新分配', event);
    showNotification(`任务 ${event.taskId} 重新分配给 ${event.newAssignedToName || event.newAssignedTo}`, 'info');
    document.dispatchEvent(new CustomEvent('task-reassigned', { detail: event }));
  }
}
