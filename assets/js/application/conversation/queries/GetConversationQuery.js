/**
 * GetConversationQuery - 获取对话详情查询
 *
 * CQRS模式：查询对象用于封装读取操作
 */

export class GetConversationQuery {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.includeMessages = data.includeMessages !== false; // 默认包含消息

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('GetConversationQuery: conversationId is required');
    }
  }
}
