/**
 * Customer Profile Domain Model
 * 客户画像领域模型
 *
 * DDD: Aggregate Root - 客户画像聚合根
 */

import { ProfileRefreshedEvent } from '../events/ProfileRefreshedEvent.js';
import { RiskLevelChangedEvent } from '../events/RiskLevelChangedEvent.js';
import { ServiceRecordAddedEvent } from '../events/ServiceRecordAddedEvent.js';
import { CommitmentProgressUpdatedEvent } from '../events/CommitmentProgressUpdatedEvent.js';
import { InteractionAddedEvent } from '../events/InteractionAddedEvent.js';
import { CustomerMarkedAsVIPEvent } from '../events/CustomerMarkedAsVIPEvent.js';
import { generateId } from '../../../core/utils.js';

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

    // 领域事件集合 - DDD核心机制
    this._domainEvents = [];
  }

  // ==================== 命令方法（改变状态） ====================

  /**
   * 刷新客户画像
   * @param {Object} newData - 新的客户数据
   */
  refresh(newData) {
    const updatedFields = [];
    const oldRiskLevel = this.getRiskLevel();

    // 更新基本信息
    if (newData.name && newData.name !== this.name) {
      this.name = newData.name;
      updatedFields.push('name');
    }
    if (newData.title && newData.title !== this.title) {
      this.title = newData.title;
      updatedFields.push('title');
    }
    if (newData.focus && newData.focus !== this.focus) {
      this.focus = newData.focus;
      updatedFields.push('focus');
    }

    // 更新联系信息
    if (newData.contacts) {
      this.contacts = new ContactInfo(newData.contacts);
      updatedFields.push('contacts');
    }

    // 更新SLA信息
    if (newData.sla) {
      this.sla = new SLAInfo(newData.sla, newData.slaStatus, newData.expire);
      updatedFields.push('sla');
    }

    // 更新产品列表
    if (newData.products) {
      this.products = newData.products;
      updatedFields.push('products');
    }

    // 更新业务指标
    if (newData.metrics) {
      this.metrics = new Metrics(newData.metrics);
      updatedFields.push('metrics');
    }

    // 更新洞察
    if (newData.insights) {
      this.insights = newData.insights.map(i => new Insight(i));
      updatedFields.push('insights');
    }

    // 更新时间戳
    this.updatedAt = new Date().toISOString();

    // 发布画像刷新事件
    if (updatedFields.length > 0) {
      this._addDomainEvent(new ProfileRefreshedEvent({
        customerId: this.conversationId,
        customerName: this.name,
        updatedFields,
        refreshedAt: this.updatedAt,
      }));
    }

    // 检查风险等级是否发生变化
    const newRiskLevel = this.getRiskLevel();
    if (newRiskLevel !== oldRiskLevel) {
      this._addDomainEvent(new RiskLevelChangedEvent({
        customerId: this.conversationId,
        oldLevel: oldRiskLevel,
        newLevel: newRiskLevel,
        reason: '画像数据更新导致风险等级变化',
        triggerType: 'auto',
      }));
    }
  }

  /**
   * 添加服务记录
   * @param {Object} record - 服务记录数据
   */
  addServiceRecord(record) {
    if (!record.id) {
      record.id = `SR-${generateId()}`;
    }
    if (!record.date) {
      record.date = new Date().toISOString();
    }

    const serviceRecord = new ServiceRecord(record);
    this.serviceRecords.push(serviceRecord);

    // 发布服务记录添加事件
    this._addDomainEvent(new ServiceRecordAddedEvent({
      customerId: this.conversationId,
      serviceRecordId: record.id,
      title: record.title,
      status: record.status || '进行中',
      owner: record.owner,
      relatedConversationIds: record.relatedConversations || [],
    }));
  }

  /**
   * 更新承诺进度
   * @param {string} commitmentId - 承诺ID
   * @param {number} progress - 新的进度（0-100）
   */
  updateCommitmentProgress(commitmentId, progress) {
    const commitment = this.commitments.find(c => c.id === commitmentId);
    if (!commitment) {
      throw new Error(`未找到承诺记录: ${commitmentId}`);
    }

    if (progress < 0 || progress > 100) {
      throw new Error('进度值必须在0-100之间');
    }

    const oldProgress = commitment.progress;
    commitment.progress = progress;

    // 根据进度更新状态
    if (progress === 100) {
      commitment.status = '已完成';
    } else if (progress > 0) {
      commitment.status = '进行中';
    }

    // 检查是否存在风险（进度低于50%且临近截止日期）
    const hasRisk = commitment.risk || (progress < 50 && commitment.nextDue);

    // 发布承诺进度更新事件
    this._addDomainEvent(new CommitmentProgressUpdatedEvent({
      customerId: this.conversationId,
      commitmentId: commitment.id,
      commitmentTitle: commitment.title,
      oldProgress,
      newProgress: progress,
      hasRisk,
      updatedBy: 'system',
    }));
  }

  /**
   * 添加互动记录
   * @param {Object} interaction - 互动记录数据
   */
  addInteraction(interaction) {
    if (!interaction.date) {
      interaction.date = new Date().toISOString();
    }

    const interactionRecord = new Interaction(interaction);
    this.interactions.unshift(interactionRecord); // 最新的排在前面

    // 发布互动记录添加事件
    this._addDomainEvent(new InteractionAddedEvent({
      customerId: this.conversationId,
      interactionType: interaction.type || '对话',
      title: interaction.title,
      channel: interaction.channel,
      result: interaction.result,
      timestamp: interaction.date,
      relatedConversationId: interaction.conversationId,
    }));
  }

  /**
   * 标记为VIP客户
   * @param {string} reason - 标记原因
   * @param {string} vipLevel - VIP等级（金牌客户 | 重点客户）
   * @param {string} markedBy - 标记人（默认为system）
   */
  markAsVIP(reason, vipLevel = '重点客户', markedBy = 'system') {
    if (!reason) {
      throw new Error('标记为VIP客户必须提供原因');
    }

    // 检查是否已经是VIP
    const alreadyVIP = this.isVIP();

    // 添加或更新VIP标签
    if (vipLevel === '金牌客户') {
      // 移除其他VIP标签
      this.tags = this.tags.filter(tag => !tag.includes('重点客户'));
      if (!this.tags.includes('金牌客户')) {
        this.tags.push('金牌客户');
      }
    } else if (vipLevel === '重点客户') {
      if (!this.tags.includes('重点客户')) {
        this.tags.push('重点客户');
      }
    }

    // 仅在新标记为VIP时发布事件
    if (!alreadyVIP || vipLevel === '金牌客户') {
      this._addDomainEvent(new CustomerMarkedAsVIPEvent({
        customerId: this.conversationId,
        customerName: this.name,
        reason,
        markedBy,
        markedAt: new Date().toISOString(),
        vipLevel,
      }));
    }
  }

  // ==================== 查询方法（不改变状态） ====================

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
    if (hasRisk && hasUrgent) {
      return 'high';
    }
    if (hasRisk || hasUrgent) {
      return 'medium';
    }
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

  /**
   * 获取逾期承诺列表
   * @returns {Commitment[]} 逾期的承诺列表
   */
  getOverdueCommitments() {
    const now = new Date();
    return this.commitments.filter(commitment => {
      if (!commitment.nextDue || commitment.status === '已完成') {
        return false;
      }
      const dueDate = new Date(commitment.nextDue);
      return dueDate < now && commitment.progress < 100;
    });
  }

  /**
   * 获取近期服务记录
   * @param {number} days - 天数（默认30天）
   * @returns {ServiceRecord[]} 近期服务记录列表
   */
  getRecentServiceRecords(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.serviceRecords.filter(record => {
      if (!record.date) {
        return false;
      }
      const recordDate = new Date(record.date);
      return recordDate >= cutoffDate;
    });
  }

  /**
   * 获取满意度趋势
   * @returns {Object} 满意度趋势数据
   */
  getSatisfactionTrend() {
    const currentScore = this.metrics.getSatisfactionScore();

    // 计算历史平均满意度（从历史记录中推断）
    const historicalScores = this.history
      .filter(h => h.summary && h.summary.includes('满意度'))
      .map(h => {
        const match = h.summary.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      })
      .filter(score => score !== null);

    const avgHistoricalScore = historicalScores.length > 0
      ? historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length
      : currentScore;

    return {
      current: currentScore,
      historical: avgHistoricalScore,
      trend: currentScore > avgHistoricalScore ? 'up' : (currentScore < avgHistoricalScore ? 'down' : 'stable'),
      change: currentScore - avgHistoricalScore,
    };
  }

  /**
   * 获取活跃服务数量
   * @returns {number} 进行中的服务记录数量
   */
  getActiveServiceCount() {
    return this.serviceRecords.filter(s => s.isOngoing()).length;
  }

  /**
   * 是否有高风险承诺
   * @returns {boolean} 是否存在高风险承诺
   */
  hasHighRiskCommitments() {
    return this.commitments.some(c => c.hasRisk() && c.progress < 50);
  }

  /**
   * 获取未完成承诺数量
   * @returns {number} 未完成的承诺数量
   */
  getPendingCommitmentsCount() {
    return this.commitments.filter(c => c.status !== '已完成').length;
  }

  // ==================== 领域事件管理 ====================

  /**
   * 添加领域事件
   * @private
   * @param {Object} event - 领域事件
   */
  _addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  /**
   * 获取所有未提交的领域事件
   * @returns {Array} 领域事件列表
   */
  getDomainEvents() {
    return [...this._domainEvents];
  }

  /**
   * 清空领域事件（事件发布后调用）
   */
  clearDomainEvents() {
    this._domainEvents = [];
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
    if (windowFilter === '全部') {
      return true;
    }
    return this.window === windowFilter;
  }

  isOfType(typeFilter) {
    if (typeFilter === '全部') {
      return true;
    }
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
