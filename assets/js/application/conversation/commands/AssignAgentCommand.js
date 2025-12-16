/**
 * AssignAgentCommand - 分配客服命令
 */

export class AssignAgentCommand {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.agentId = data.agentId;
    this.agentName = data.agentName || '';
    this.assignedBy = data.assignedBy || 'system';
    this.timestamp = data.timestamp || new Date().toISOString();

    this._validate();
  }

  _validate() {
    if (!this.conversationId) {
      throw new Error('AssignAgentCommand: conversationId is required');
    }
    if (!this.agentId) {
      throw new Error('AssignAgentCommand: agentId is required');
    }
  }
}
