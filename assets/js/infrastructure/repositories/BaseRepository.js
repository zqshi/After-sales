/**
 * Repository基类
 * 提供数据访问的抽象层,实现仓储模式
 *
 * 仓储模式的职责:
 * - 封装数据访问逻辑
 * - 提供领域对象的持久化和检索
 * - 隐藏底层数据源(API、LocalStorage等)
 * - 提供缓存机制
 *
 * @example
 * class ConversationRepository extends BaseRepository {
 *   constructor() {
 *     super('conversation', {
 *       cacheEnabled: true,
 *       cacheTTL: 60000,
 *     });
 *   }
 *
 *   async getById(id) {
 *     return this.withCache(id, async () => {
 *       const data = await this.apiClient.get(`/im/conversations/${id}`);
 *       return new Conversation(data);
 *     });
 *   }
 * }
 */

export class BaseRepository {
  /**
   * @param {string} entityName - 实体名称(用于日志和缓存键)
   * @param {Object} options - 配置选项
   * @param {boolean} options.cacheEnabled - 是否启用缓存
   * @param {number} options.cacheTTL - 缓存过期时间(毫秒)
   * @param {Object} options.apiClient - API客户端实例
   */
  constructor(entityName, options = {}) {
    this.entityName = entityName;
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL ?? 60000; // 默认60秒
    this.apiClient = options.apiClient || null; // 由子类注入
    this.cache = new Map(); // 简单的内存缓存
  }

  /**
   * 带缓存的数据获取
   * @param {string} key - 缓存键
   * @param {Function} fetchFn - 数据获取函数
   * @returns {Promise<any>}
   */
  async withCache(key, fetchFn) {
    if (!this.cacheEnabled) {
      return fetchFn();
    }

    // 检查缓存
    const cached = this._getFromCache(key);
    if (cached) {
      return cached.data;
    }

    // 获取新数据
    const data = await fetchFn();

    // 存入缓存
    this._setToCache(key, data);

    return data;
  }

  /**
   * 从缓存获取数据
   * @private
   */
  _getFromCache(key) {
    const cacheKey = this._getCacheKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    if (import.meta.env.DEV) {
      console.log(`[${this.entityName}Repository] Cache hit:`, key);
    }

    return cached;
  }

  /**
   * 存入缓存
   * @private
   */
  _setToCache(key, data) {
    const cacheKey = this._getCacheKey(key);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    if (import.meta.env.DEV) {
      console.log(`[${this.entityName}Repository] Cache set:`, key);
    }
  }

  /**
   * 生成缓存键
   * @private
   */
  _getCacheKey(key) {
    return `${this.entityName}:${key}`;
  }

  /**
   * 清除指定缓存
   * @param {string} key - 缓存键
   */
  clearCache(key) {
    if (key) {
      const cacheKey = this._getCacheKey(key);
      this.cache.delete(cacheKey);
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entityName: this.entityName,
      cacheEnabled: this.cacheEnabled,
      cacheTTL: this.cacheTTL,
    };
  }

  /**
   * 通用的查找方法 (子类可覆盖)
   * @param {string} id - 实体ID
   * @returns {Promise<any>}
   */
  async findById(id) {
    throw new Error(`[${this.entityName}Repository] findById() must be implemented by subclass`);
  }

  /**
   * 通用的保存方法 (子类可覆盖)
   * @param {Object} entity - 实体对象
   * @returns {Promise<any>}
   */
  async save(entity) {
    throw new Error(`[${this.entityName}Repository] save() must be implemented by subclass`);
  }

  /**
   * 通用的删除方法 (子类可覆盖)
   * @param {string} id - 实体ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error(`[${this.entityName}Repository] delete() must be implemented by subclass`);
  }

  /**
   * 通用的查询方法 (子类可覆盖)
   * @param {Object} criteria - 查询条件
   * @returns {Promise<Array>}
   */
  async findAll(criteria = {}) {
    throw new Error(`[${this.entityName}Repository] findAll() must be implemented by subclass`);
  }
}
