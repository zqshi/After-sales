/**
 * Customer Profile Domain Model
 * 客户画像领域模型
 *
 * DDD: Entity - 客户画像聚合根
 */

export class CustomerProfile {
  constructor(data) {
    this.conversationId = data.conversationId || '';
    this.name = data.name || '';
    this.title = data.title || '';
    this.tags = data.tags || [];
    this.updatedAt = data.updatedAt || '';
    this.focus = data.focus || '';
    this.contacts = new ContactInfo(data.contacts || {});
    this.sla = new SLAInfo(data.sla, data.slaStatus, data.expire);
    this.products = data.products || [];
    this.metrics = new Metrics(data.metrics || {});
    this.insights = (data.insights || []).map(i => new Insight(i));
    this.interactions = (data.interactions || []).map(i => new Interaction(i));
    this.conversationHistory = (data.conversationHistory || []).map(c => new ConversationRecord(c));
    this.serviceRecords = (data.serviceRecords || []).map(s => new ServiceRecord(s));
    this.commitments = (data.commitments || []).map(c => new Commitment(c));
    this.history = (data.history || []).map(h => new HistoryRecord(h));
    this.contractRange = data.contractRange || '';
  }

  /**
   * 是否为VIP客户
   */
  isVIP() {
    return this.tags.some(tag => tag.includes('金牌') || tag.includes('重点客户'));
  }

  /**
   * 获取风险等级
   */
  getRiskLevel() {
    const hasRisk = this.commitments.some(c => c.risk);
    const hasUrgent = this.insights.some(i => i.title.includes('风险') || i.title.includes('紧急'));
    if (hasRisk && hasUrgent) return 'high';
    if (hasRisk || hasUrgent) return 'medium';
    return 'low';
  }

  /**
   * 获取近期互动统计
   */
  getRecentInteractionStats() {
    return {
      total: this.interactions.length,
      resolved: this.interactions.filter(i => i.result === '已解决').length,
      pending: this.interactions.filter(i => i.result === '进行中').length,
    };
  }
}

/**
 * 联系信息值对象
 */
export class ContactInfo {
  constructor(data) {
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.wechat = data.wechat || '';
  }
}

/**
 * SLA信息值对象
 */
export class SLAInfo {
  constructor(sla, status, expire) {
    this.level = sla || '';
    this.status = status || '';
    this.expireDate = expire || '';
  }

  isValid() {
    return this.status === '有效';
  }

  isExpiring() {
    return this.status === '即将到期';
  }
}

/**
 * 业务指标值对象
 */
export class Metrics {
  constructor(data) {
    this.contractAmount = data.contractAmount || '';
    this.satisfaction = data.satisfaction || '';
    this.duration = data.duration || '';
  }

  getSatisfactionScore() {
    const match = this.satisfaction.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
}

/**
 * 洞察实体
 */
export class Insight {
  constructor(data) {
    this.title = data.title || '';
    this.desc = data.desc || '';
    this.action = data.action || '';
  }
}

/**
 * 互动记录实体
 */
export class Interaction {
  constructor(data) {
    this.title = data.title || '';
    this.desc = data.desc || '';
    this.date = data.date || '';
    this.icon = data.icon || '';
    this.type = data.type || '';
    this.window = data.window || '';
    this.channel = data.channel || '';
    this.result = data.result || '';
  }

  isInTimeWindow(windowFilter) {
    if (windowFilter === '全部') return true;
    return this.window === windowFilter;
  }

  isOfType(typeFilter) {
    if (typeFilter === '全部') return true;
    return this.type === typeFilter;
  }
}

/**
 * 对话记录实体
 */
export class ConversationRecord {
  constructor(data) {
    this.id = data.id || '';
    this.time = data.time || '';
    this.channel = data.channel || '';
    this.summary = data.summary || '';
    this.detail = data.detail || '';
    this.intent = data.intent || '';
    this.emotion = data.emotion || '';
    this.product = data.product || '';
    this.relatedServiceId = data.relatedServiceId || '';
    this.anchorLabel = data.anchorLabel;
  }
}

/**
 * 服务记录实体
 */
export class ServiceRecord {
  constructor(data) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.date = data.date || '';
    this.status = data.status || '';
    this.promise = data.promise || '';
    this.promiseStatus = data.promiseStatus || '';
    this.duration = data.duration || '';
    this.owner = data.owner || '';
    this.result = data.result || '';
    this.evidence = data.evidence || '';
    this.commitmentId = data.commitmentId || '';
    this.relatedConversations = data.relatedConversations || [];
    this.actions = data.actions || [];
    this.detail = data.detail || '';
    this.completedAt = data.completedAt;
    this.due = data.due || '';
  }

  isCompleted() {
    return this.status === '已完成';
  }

  isOngoing() {
    return this.status === '进行中';
  }
}

/**
 * 承诺实体
 */
export class Commitment {
  constructor(data) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.metric = data.metric || '';
    this.used = data.used || 0;
    this.total = data.total || 0;
    this.progress = data.progress || 0;
    this.status = data.status || '';
    this.remark = data.remark || '';
    this.nextDue = data.nextDue || '';
    this.risk = data.risk || null;
  }

  hasRisk() {
    return this.risk !== null && this.risk !== '';
  }

  getProgressPercentage() {
    return this.progress;
  }
}

/**
 * 历史记录实体
 */
export class HistoryRecord {
  constructor(data) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.date = data.date || '';
    this.status = data.status || '';
    this.summary = data.summary || '';
    this.detail = data.detail || '';
    this.transcript = (data.transcript || []).map(t => new TranscriptEntry(t));
    this.actions = data.actions || [];
  }
}

/**
 * 对话转录条目值对象
 */
export class TranscriptEntry {
  constructor(data) {
    this.time = data.time || '';
    this.role = data.role || '';
    this.content = data.content || '';
  }
}
