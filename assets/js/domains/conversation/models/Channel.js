/**
 * Channel - 对话渠道值对象
 *
 * 校验渠道类型并提供便捷方法
 */
export class Channel {
  constructor(type = 'chat') {
    this.type = type;
    this._validate();
  }

  _validate() {
    const validTypes = ['chat', 'email', 'phone', 'feishu', 'wechat', 'qq'];
    if (!validTypes.includes(this.type)) {
      throw new Error(`Invalid channel type: ${this.type}`);
    }
  }

  equals(other) {
    return other instanceof Channel && this.type === other.type;
  }

  toString() {
    return this.type;
  }
}
