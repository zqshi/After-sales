/**
 * GetRequirementListQuery - 获取需求列表查询
 */

export class GetRequirementListQuery {
  constructor(data = {}) {
    this.status = data.status || 'all'; // all | pending | processing | completed
    this.source = data.source || 'all'; // all | manual | auto-detected
    this.limit = data.limit || 50;
    this.offset = data.offset || 0;

    this._validate();
  }

  _validate() {
    if (this.limit < 1 || this.limit > 100) {
      throw new Error('GetRequirementListQuery: limit must be between 1 and 100');
    }
    if (this.offset < 0) {
      throw new Error('GetRequirementListQuery: offset must be >= 0');
    }
  }
}
