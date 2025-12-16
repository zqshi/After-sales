/**
 * DIContainer - 依赖注入容器
 *
 * 负责管理应用中所有服务的实例化和依赖注入
 * 支持单例模式和工厂模式
 */

export class DIContainer {
  constructor() {
    this._services = new Map();
    this._singletons = new Map();
  }

  /**
   * 注册服务
   * @param {string} name - 服务名称
   * @param {Function} factory - 工厂函数，返回服务实例
   * @param {boolean} singleton - 是否为单例（默认true）
   */
  register(name, factory, singleton = true) {
    this._services.set(name, {
      factory,
      singleton,
    });
  }

  /**
   * 解析服务（获取服务实例）
   * @param {string} name - 服务名称
   * @returns {*} 服务实例
   */
  resolve(name) {
    const service = this._services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    // 如果是单例且已实例化，直接返回
    if (service.singleton && this._singletons.has(name)) {
      return this._singletons.get(name);
    }

    // 调用工厂函数创建实例
    const instance = service.factory(this);

    // 如果是单例，缓存实例
    if (service.singleton) {
      this._singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * 批量注册服务
   * @param {Object} services - 服务映射对象
   */
  registerBatch(services) {
    for (const [name, config] of Object.entries(services)) {
      this.register(name, config.factory, config.singleton !== false);
    }
  }

  /**
   * 清空所有服务（主要用于测试）
   */
  clear() {
    this._services.clear();
    this._singletons.clear();
  }

  /**
   * 检查服务是否已注册
   * @param {string} name - 服务名称
   * @returns {boolean} 是否已注册
   */
  has(name) {
    return this._services.has(name);
  }
}
