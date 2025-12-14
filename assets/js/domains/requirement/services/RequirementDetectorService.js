/**
 * 需求识别领域服务
 *
 * 职责：
 * - 从对话消息中识别客户需求
 * - 提取需求的类别、优先级和描述
 * - 计算识别的置信度
 *
 * 这是一个无状态的领域服务
 * 注意：这里是简化的规则引擎，实际项目中应该对接AI服务
 */

import { RequirementCategory } from '../models/Requirement.js';

/**
 * 需求识别规则
 */
const REQUIREMENT_PATTERNS = {
  // 功能需求关键词
  FEATURE: [
    '能否',
    '可以',
    '希望',
    '想要',
    '需要',
    '增加',
    '添加',
    '新增',
    '支持',
    '实现',
    '开发',
  ],
  // 性能需求关键词
  PERFORMANCE: ['慢', '卡', '延迟', '速度', '快一点', '优化', '提升性能', '响应时间'],
  // Bug反馈关键词
  BUG: [
    '报错',
    '错误',
    '异常',
    '失败',
    '不能用',
    '无法',
    '不行',
    '有问题',
    'bug',
    '故障',
  ],
  // 优化建议关键词
  IMPROVEMENT: [
    '建议',
    '改进',
    '优化',
    '更好',
    '体验',
    '易用',
    '方便',
    '不太好用',
    '麻烦',
  ],
};

/**
 * 优先级判断规则
 */
const PRIORITY_PATTERNS = {
  urgent: ['紧急', '马上', '立即', '尽快', '着急', '影响业务', '无法使用'],
  high: ['重要', '很需要', '急需', '关键', '核心'],
  medium: ['希望', '建议', '可以', '最好'],
  low: ['有空', '方便的话', '建议'],
};

/**
 * 需求识别服务
 */
export class RequirementDetectorService {
  /**
   * 从消息中检测需求
   * @param {Message} message - 消息对象
   * @returns {object|null} 需求信息或null
   */
  detectRequirement(message) {
    // 只处理客户发送的消息
    if (message.senderType !== 'customer') {
      return null;
    }

    const content = message.content;

    // 检测是否包含需求
    const category = this._detectCategory(content);
    if (!category) {
      return null;
    }

    // 提取需求信息
    const priority = this._detectPriority(content);
    const title = this._extractTitle(content, category);
    const confidence = this._calculateConfidence(content, category);

    // 置信度太低则不识别
    if (confidence < 0.3) {
      return null;
    }

    return {
      category,
      title,
      description: content,
      priority,
      confidence,
      sourceMessageId: message.id,
    };
  }

  /**
   * 从对话中批量检测需求
   * @param {Conversation} conversation - 对话聚合
   * @returns {Array} 需求列表
   */
  detectRequirementsFromConversation(conversation) {
    const requirements = [];
    const customerMessages = conversation.getCustomerMessages();

    for (const message of customerMessages) {
      const requirement = this.detectRequirement(message);
      if (requirement) {
        // 补充对话和客户信息
        requirement.conversationId = conversation.id;
        requirement.customerId = conversation.customerId;
        requirement.customerName = conversation.customerName;
        requirement.sourceMessageIds = [message.id];

        requirements.push(requirement);
      }
    }

    // 合并相似需求
    return this._mergeSimilarRequirements(requirements);
  }

  /**
   * 检测需求类别
   * @private
   */
  _detectCategory(content) {
    const scores = {
      FEATURE: 0,
      PERFORMANCE: 0,
      BUG: 0,
      IMPROVEMENT: 0,
    };

    // 计算每个类别的匹配分数
    for (const [category, patterns] of Object.entries(REQUIREMENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          scores[category]++;
        }
      }
    }

    // 找出得分最高的类别
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return null; // 没有匹配到任何需求关键词
    }

    const category = Object.keys(scores).find((key) => scores[key] === maxScore);
    return RequirementCategory[category];
  }

  /**
   * 检测优先级
   * @private
   */
  _detectPriority(content) {
    // 按优先级从高到低检测
    const priorities = ['urgent', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      const patterns = PRIORITY_PATTERNS[priority];
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          return priority;
        }
      }
    }

    return 'medium'; // 默认中等优先级
  }

  /**
   * 提取需求标题
   * @private
   */
  _extractTitle(content, category) {
    // 简化处理：取第一句话作为标题，最多30字
    const firstSentence = content.split(/[。！？\n]/)[0];
    const title = firstSentence.substring(0, 30);

    // 如果标题太短，添加类别前缀
    if (title.length < 5) {
      return `${category} - ${title}`;
    }

    return title;
  }

  /**
   * 计算识别置信度
   * @private
   */
  _calculateConfidence(content, category) {
    let confidence = 0.5; // 基础置信度

    // 根据匹配的关键词数量提高置信度
    const patterns = REQUIREMENT_PATTERNS[Object.keys(RequirementCategory).find(
      key => RequirementCategory[key] === category
    )] || [];

    const matchCount = patterns.filter((pattern) => content.includes(pattern)).length;
    confidence += matchCount * 0.1;

    // 根据消息长度调整置信度
    if (content.length < 10) {
      confidence -= 0.2; // 太短，可能不是需求
    } else if (content.length > 100) {
      confidence += 0.1; // 较长，可能是详细的需求描述
    }

    // 包含问号可能是需求
    if (content.includes('?') || content.includes('？')) {
      confidence += 0.1;
    }

    // 限制在0-1之间
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 合并相似需求
   * @private
   */
  _mergeSimilarRequirements(requirements) {
    if (requirements.length <= 1) {
      return requirements;
    }

    const merged = [];
    const processed = new Set();

    for (let i = 0; i < requirements.length; i++) {
      if (processed.has(i)) continue;

      const current = requirements[i];
      const similar = [];

      // 查找相似的需求
      for (let j = i + 1; j < requirements.length; j++) {
        if (processed.has(j)) continue;

        const other = requirements[j];
        if (this._isSimilar(current, other)) {
          similar.push(other);
          processed.add(j);
        }
      }

      // 如果找到相似需求，合并它们
      if (similar.length > 0) {
        const mergedReq = {
          ...current,
          description: [current.description, ...similar.map((r) => r.description)].join(
            '\n---\n'
          ),
          sourceMessageIds: [
            ...current.sourceMessageIds,
            ...similar.flatMap((r) => r.sourceMessageIds),
          ],
          confidence: Math.max(current.confidence, ...similar.map((r) => r.confidence)),
        };
        merged.push(mergedReq);
      } else {
        merged.push(current);
      }

      processed.add(i);
    }

    return merged;
  }

  /**
   * 判断两个需求是否相似
   * @private
   */
  _isSimilar(req1, req2) {
    // 类别必须相同
    if (req1.category !== req2.category) {
      return false;
    }

    // 标题相似度检测（简化版）
    const title1 = req1.title.toLowerCase();
    const title2 = req2.title.toLowerCase();

    // 如果标题完全包含或被包含
    if (title1.includes(title2) || title2.includes(title1)) {
      return true;
    }

    return false;
  }

  /**
   * 验证需求是否有效
   * @param {object} requirement - 需求信息
   * @returns {boolean} 是否有效
   */
  isValidRequirement(requirement) {
    if (!requirement) return false;
    if (!requirement.category) return false;
    if (!requirement.title || requirement.title.length < 2) return false;
    if (!requirement.description || requirement.description.length < 5) return false;
    if (requirement.confidence < 0.3) return false;

    return true;
  }
}

/**
 * 单例导出
 */
export const requirementDetector = new RequirementDetectorService();
