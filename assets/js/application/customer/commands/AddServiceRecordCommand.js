/**
 * AddServiceRecordCommand - 添加服务记录命令
 */

export class AddServiceRecordCommand {
  constructor(data) {
    this.customerId = data.customerId;
    this.title = data.title;
    this.status = data.status || '进行中';
    this.owner = data.owner || '';
    this.relatedConversationIds = data.relatedConversationIds || [];
    this.timestamp = data.timestamp || new Date().toISOString();

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('AddServiceRecordCommand: customerId is required');
    }
    if (!this.title) {
      throw new Error('AddServiceRecordCommand: title is required');
    }
  }
}
