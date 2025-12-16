/**
 * CloseConversationCommand - 关闭对话命令
 */

export class CloseConversationCommand {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.closedBy = data.closedBy || 'system';
    this.reason = data.reason || '';
    this.timestamp = data.timestamp || new Date().toISOString();

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('CloseConversationCommand: conversationId is required');
    }
  }
}
