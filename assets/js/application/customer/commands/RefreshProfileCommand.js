/**
 * RefreshProfileCommand - 刷新客户画像命令
 */

export class RefreshProfileCommand {
  constructor(data) {
    this.customerId = data.customerId;
    this.profileData = data.profileData || {};
    this.triggeredBy = data.triggeredBy || 'system';
    this.timestamp = data.timestamp || new Date().toISOString();

    this._validate();
  }

  _validate() {
    if (!this.customerId) {
      throw new Error('RefreshProfileCommand: customerId is required');
    }
  }
}
