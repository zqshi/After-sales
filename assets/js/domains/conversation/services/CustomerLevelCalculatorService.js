/**
 * 客户等级计算领域服务
 *
 * 职责：
 * - 根据客户等级和对话数据计算客户等级目标
 * - 判断客户等级是否违规
 * - 计算首次响应时间和解决时间
 *
 * 这是一个无状态的领域服务
 */

/**
 * 客户等级等级配置
 */
const CustomerLevel_LEVELS = {
  金牌: {
    firstResponseTarget: 5, // 首次响应时间目标（分钟）
    resolutionTarget: 120, // 解决时间目标（分钟）
  },
  银牌: {
    firstResponseTarget: 10,
    resolutionTarget: 240,
  },
  铜牌: {
    firstResponseTarget: 30,
    resolutionTarget: 480,
  },
  普通: {
    firstResponseTarget: 60,
    resolutionTarget: 1440, // 24小时
  },
};

/**
 * 客户等级计算服务
 */
export class CustomerLevelCalculatorService {
  /**
   * 获取客户等级配置
   * @param {string} level - 客户等级等级
   * @returns {object} 客户等级配置
   */
  getCustomerLevelConfig(level) {
    return CustomerLevel_LEVELS[level] || CustomerLevel_LEVELS['普通'];
  }

  /**
   * 计算首次响应时间（分钟）
   * @param {Date|string} conversationStartTime - 对话开始时间
   * @param {Date|string} firstAgentResponseTime - 客服首次响应时间
   * @returns {number} 首次响应时间（分钟）
   */
  calculateFirstResponseTime(conversationStartTime, firstAgentResponseTime) {
    if (!firstAgentResponseTime) {
      // 如果还没有响应，返回到现在的时间
      return this._getMinutesDiff(conversationStartTime, new Date());
    }
    return this._getMinutesDiff(conversationStartTime, firstAgentResponseTime);
  }

  /**
   * 计算解决时间（分钟）
   * @param {Date|string} conversationStartTime - 对话开始时间
   * @param {Date|string} resolutionTime - 解决时间
   * @returns {number} 解决时间（分钟）
   */
  calculateResolutionTime(conversationStartTime, resolutionTime) {
    if (!resolutionTime) {
      // 如果还没有解决，返回到现在的时间
      return this._getMinutesDiff(conversationStartTime, new Date());
    }
    return this._getMinutesDiff(conversationStartTime, resolutionTime);
  }

  /**
   * 检查首次响应是否超时
   * @param {string} slaLevel - 客户等级等级
   * @param {number} actualTime - 实际时间（分钟）
   * @returns {boolean} 是否超时
   */
  isFirstResponseViolated(slaLevel, actualTime) {
    const config = this.getCustomerLevelConfig(slaLevel);
    return actualTime > config.firstResponseTarget;
  }

  /**
   * 检查解决时间是否超时
   * @param {string} slaLevel - 客户等级等级
   * @param {number} actualTime - 实际时间（分钟）
   * @returns {boolean} 是否超时
   */
  isResolutionViolated(slaLevel, actualTime) {
    const config = this.getCustomerLevelConfig(slaLevel);
    return actualTime > config.resolutionTarget;
  }

  /**
   * 计算客户等级状态
   * @param {object} conversation - 对话聚合
   * @param {string} slaLevel - 客户等级等级
   * @returns {object} 客户等级状态
   */
  calculateCustomerLevelStatus(conversation, slaLevel) {
    const config = this.getCustomerLevelConfig(slaLevel);

    // 获取首次客服响应时间
    const firstAgentMessage = conversation.messages.find(
      (m) => m.senderType === 'agent',
    );
    const firstAgentResponseTime = firstAgentMessage
      ? firstAgentMessage.timestamp
      : null;

    // 计算首次响应时间
    const firstResponseElapsed = this.calculateFirstResponseTime(
      conversation.createdAt,
      firstAgentResponseTime,
    );

    // 计算解决时间
    const resolutionElapsed = this.calculateResolutionTime(
      conversation.createdAt,
      conversation.closedAt,
    );

    // 判断是否违规
    const firstResponseViolated = this.isFirstResponseViolated(
      slaLevel,
      firstResponseElapsed,
    );
    const resolutionViolated = this.isResolutionViolated(
      slaLevel,
      resolutionElapsed,
    );

    return {
      status: slaLevel,
      firstResponseTarget: config.firstResponseTarget,
      resolutionTarget: config.resolutionTarget,
      firstResponseElapsed,
      resolutionElapsed,
      isViolated: firstResponseViolated || resolutionViolated,
      violationType: firstResponseViolated
        ? 'firstResponse'
        : resolutionViolated
          ? 'resolution'
          : null,
      severity: this._calculateSeverity(
        firstResponseViolated,
        resolutionViolated,
        firstResponseElapsed,
        resolutionElapsed,
        config,
      ),
    };
  }

  /**
   * 计算违规严重程度
   * @private
   */
  _calculateSeverity(
    firstResponseViolated,
    resolutionViolated,
    firstResponseElapsed,
    resolutionElapsed,
    config,
  ) {
    if (!firstResponseViolated && !resolutionViolated) {
      return null;
    }

    // 计算超时百分比
    let delayPercentage = 0;
    if (firstResponseViolated) {
      delayPercentage =
        ((firstResponseElapsed - config.firstResponseTarget) /
          config.firstResponseTarget) *
        100;
    } else if (resolutionViolated) {
      delayPercentage =
        ((resolutionElapsed - config.resolutionTarget) /
          config.resolutionTarget) *
        100;
    }

    // 根据超时百分比判断严重程度
    if (delayPercentage >= 100) {
      return 'critical';
    } // 超时100%以上
    if (delayPercentage >= 50) {
      return 'major';
    } // 超时50%-100%
    return 'minor'; // 超时50%以内
  }

  /**
   * 计算两个时间之间的分钟数
   * @private
   */
  _getMinutesDiff(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end - start) / (1000 * 60));
  }

  /**
   * 获取剩余时间（分钟）
   * @param {string} slaLevel - 客户等级等级
   * @param {Date|string} startTime - 开始时间
   * @param {string} type - 'firstResponse' | 'resolution'
   * @returns {number} 剩余时间（分钟），负数表示已超时
   */
  getRemainingTime(slaLevel, startTime, type = 'firstResponse') {
    const config = this.getCustomerLevelConfig(slaLevel);
    const target =
      type === 'firstResponse'
        ? config.firstResponseTarget
        : config.resolutionTarget;
    const elapsed = this._getMinutesDiff(startTime, new Date());
    return target - elapsed;
  }

  /**
   * 判断是否即将超时（剩余时间少于目标的20%）
   * @param {string} slaLevel - 客户等级等级
   * @param {Date|string} startTime - 开始时间
   * @param {string} type - 'firstResponse' | 'resolution'
   * @returns {boolean} 是否即将超时
   */
  isApproachingViolation(slaLevel, startTime, type = 'firstResponse') {
    const config = this.getCustomerLevelConfig(slaLevel);
    const target =
      type === 'firstResponse'
        ? config.firstResponseTarget
        : config.resolutionTarget;
    const remaining = this.getRemainingTime(slaLevel, startTime, type);
    return remaining > 0 && remaining <= target * 0.2; // 剩余时间少于20%
  }
}

/**
 * 单例导出
 */
export const slaCalculator = new CustomerLevelCalculatorService();
