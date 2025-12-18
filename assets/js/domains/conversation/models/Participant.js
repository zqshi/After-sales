/**
 * Participant - 对话参与者值对象
 */
export class Participant {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type; // 'customer' | 'agent'
    this.avatar = data.avatar || '';
  }

  equals(other) {
    return other instanceof Participant && this.id === other.id;
  }
}
