/**
 * IProfileRepository - 客户画像仓储接口
 *
 * 定义了 CustomerProfileRepository 需要实现的方法，便于与依赖倒置原则保持一致。
 */
export class IProfileRepository {
  /**
   * 根据客户ID加载画像
   * @param {string} customerId
   */
  async findById(_customerId) {
    throw new Error('[IProfileRepository] findById() must be implemented');
  }

  /**
   * 获取客户互动记录
   * @param {string} customerId
   * @param {Object} filters
   */
  async getInteractions(_customerId, _filters = {}) {
    throw new Error('[IProfileRepository] getInteractions() must be implemented');
  }

  /**
   * 保存画像
   * @param {CustomerProfile} profile
   */
  async save(_profile) {
    throw new Error('[IProfileRepository] save() must be implemented');
  }

  /**
   * 刷新画像
   * @param {string} customerId
   */
  async refresh(_customerId) {
    throw new Error('[IProfileRepository] refresh() must be implemented');
  }
}
