/**
 * RequirementSource - 需求来源值对象
 */
export class RequirementSource {
  static VALID = new Set(['manual', 'auto-detected', 'imported', 'ai-suggested']);

  constructor(raw = 'manual') {
    const normalized = (raw || 'manual').toString().toLowerCase();
    this.value = RequirementSource.VALID.has(normalized) ? normalized : 'manual';
  }

  isAutoDetected() {
    return this.value === 'auto-detected' || this.value === 'ai-suggested';
  }

  toString() {
    return this.value;
  }
}
