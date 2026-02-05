export class IQualityRepository {
  async getLatestByConversation(_conversationId) {
    throw new Error('[IQualityRepository] getLatestByConversation() must be implemented');
  }

  async listByConversation(_conversationId, _filters = {}) {
    throw new Error('[IQualityRepository] listByConversation() must be implemented');
  }

  async listLatest(_filters = {}) {
    throw new Error('[IQualityRepository] listLatest() must be implemented');
  }
}
