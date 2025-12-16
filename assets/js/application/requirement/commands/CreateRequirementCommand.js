/**
 * CreateRequirementCommand - 创建需求命令
 */

export class CreateRequirementCommand {
  constructor(data) {
    this.content = data.content;
    this.source = data.source || 'manual'; // manual | auto-detected
    this.conversationId = data.conversationId || null;
    this.customerId = data.customerId || null;
    this.priority = data.priority || 'medium';
    this.confidence = data.confidence || 1.0;
    this.timestamp = data.timestamp || new Date().toISOString();

    this._validate();
  }

  _validate() {
    if (!this.content || this.content.trim() === '') {
      throw new Error('CreateRequirementCommand: content is required');
    }
    if (this.confidence < 0 || this.confidence > 1) {
      throw new Error('CreateRequirementCommand: confidence must be between 0 and 1');
    }
  }
}
