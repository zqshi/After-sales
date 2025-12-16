/**
 * GetProfileQuery - 获取客户画像查询
 */

export class GetProfileQuery {
  constructor(data) {
    this.customerId = data.customerId;
    this.includeHistory = data.includeHistory !== false; // 默认包含历史
    this.includeInsights = data.includeInsights !== false; // 默认包含洞察

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('GetProfileQuery: customerId is required');
    }
  }
}
