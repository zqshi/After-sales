/**
 * SendMessageCommand - 发送消息命令
 *
 * CQRS模式：命令对象用于封装改变系统状态的操作
 */

export class SendMessageCommand {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.senderId = data.senderId;
    this.senderType = data.senderType; // internal | external
    this.content = data.content;
    this.timestamp = data.timestamp || new Date().toISOString();

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('SendMessageCommand: conversationId is required');
    }
    if (!this.senderId) {
      throw new Error('SendMessageCommand: senderId is required');
    }
    if (!this.senderType) {
      throw new Error('SendMessageCommand: senderType is required');
    }
    if (!this.content || this.content.trim() === '') {
      throw new Error('SendMessageCommand: content is required');
    }
    if (!['internal', 'external'].includes(this.senderType)) {
      throw new Error('SendMessageCommand: invalid senderType');
    }
  }
}
