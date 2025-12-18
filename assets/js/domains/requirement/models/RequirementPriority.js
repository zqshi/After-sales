/**
 * RequirementPriority - 需求优先级值对象
 */
export class RequirementPriority {
  static VALUES = ['low', 'medium', 'high', 'urgent'];

  constructor(raw = 'medium') {
    const normalized = (raw || 'medium').toString().toLowerCase();
    this.value = RequirementPriority.VALUES.includes(normalized)
      ? normalized
      : 'medium';
  }

  isHigh() {
    return this.value === 'high' || this.value === 'urgent';
  }

  isUrgent() {
    return this.value === 'urgent';
  }

  toString() {
    return this.value;
  }
}
