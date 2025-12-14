/**
 * LRU (Least Recently Used) 缓存实现
 * 当缓存达到容量上限时,自动淘汰最久未使用的项
 *
 * 特性:
 * - O(1)时间复杂度的get/set操作
 * - 自动淘汰最久未使用的数据
 * - 支持TTL过期时间
 * - 提供缓存统计信息
 *
 * @example
 * const cache = new LRUCache(100); // 最多缓存100项
 *
 * // 设置缓存
 * cache.set('key1', { data: 'value' });
 *
 * // 获取缓存
 * const value = cache.get('key1');
 *
 * // 带TTL的缓存
 * cache.set('key2', { data: 'value2' }, 60000); // 60秒后过期
 */
export class LRUCache {
  /**
   * @param {number} capacity - 最大容量
   */
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = new Map();
    this.hits = 0; // 命中次数
    this.misses = 0; // 未命中次数
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值,如果不存在或已过期返回null
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const entry = this.cache.get(key);

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间(毫秒),可选
   */
  set(key, value, ttl = null) {
    // 如果已存在,先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 如果已达容量上限,删除最久未使用的项(第一个)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // 计算过期时间
    const expiresAt = ttl ? Date.now() + ttl : null;

    // 添加新项(放在末尾)
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const entry = this.cache.get(key);

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {boolean} 是否成功删除
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * 清理过期的缓存项
   * @returns {number} 清理的项数
   */
  cleanup() {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取缓存统计信息
   * @returns {Object}
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      capacity: this.capacity,
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      utilization: ((this.cache.size / this.capacity) * 100).toFixed(2) + '%',
    };
  }

  /**
   * 获取所有缓存键
   * @returns {Array<string>}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有缓存值
   * @returns {Array<any>}
   */
  values() {
    return Array.from(this.cache.values()).map((entry) => entry.value);
  }

  /**
   * 遍历缓存
   * @param {Function} callback - (value, key) => void
   */
  forEach(callback) {
    for (const [key, entry] of this.cache.entries()) {
      // 跳过过期项
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        continue;
      }
      callback(entry.value, key);
    }
  }
}
