/**
 * IConversationRepository - 对话仓储接口
 *
 * 提供对话查询、保存以及行为相关的契约。
 */
export class IConversationRepository {
  async findById(_conversationId) {
    throw new Error('[IConversationRepository] findById() must be implemented');
  }

  async findAll(_filters = {}) {
    throw new Error('[IConversationRepository] findAll() must be implemented');
  }

  async save(_conversation) {
    throw new Error('[IConversationRepository] save() must be implemented');
  }

  async list(_filters = {}) {
    throw new Error('[IConversationRepository] list() must be implemented');
  }

  async sendMessage(_conversationId, _message) {
    throw new Error('[IConversationRepository] sendMessage() must be implemented');
  }

  async close(_conversationId, _payload) {
    throw new Error('[IConversationRepository] close() must be implemented');
  }
}
