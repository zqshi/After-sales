/**
 * AI分析结果缓存服务
 * 避免频繁请求相同会话的AI分析数据
 */

export class AiAnalysisCache {
  constructor(maxSize = 10, maxAge = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize; // 最大缓存数量
    this.maxAge = maxAge; // 缓存有效期（毫秒），默认1分钟
  }

  /**
   * 设置缓存
   * @param {string} conversationId - 会话ID
   * @param {Object} data - AI分析数据
   */
  set(conversationId, data) {
    // 如果缓存已满，删除最早的条目（LRU策略）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(conversationId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取缓存
   * @param {string} conversationId - 会话ID
   * @returns {Object|null} - 缓存的数据，如果不存在或过期返回null
   */
  get(conversationId) {
    const cached = this.cache.get(conversationId);

    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(conversationId);
      return null;
    }

    return cached.data;
  }

  /**
   * 删除缓存
   * @param {string} conversationId - 会话ID
   */
  delete(conversationId) {
    this.cache.delete(conversationId);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * 检查是否有缓存
   * @param {string} conversationId - 会话ID
   * @returns {boolean}
   */
  has(conversationId) {
    const cached = this.cache.get(conversationId);
    if (!cached) {
      return false;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(conversationId);
      return false;
    }

    return true;
  }
}
