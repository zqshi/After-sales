/**
 * Customer Profile Repository
 * 客户画像数据仓储
 *
 * DDD: Repository - 负责数据持久化和检索
 */

import { CustomerProfile } from '../../domains/customer/models/Profile.js';
import { IProfileRepository } from '../../domains/customer/repositories/IProfileRepository.js';
import { fetchProfile, fetchProfileInteractions, refreshProfile, isApiEnabled } from '../../api.js';

export class CustomerProfileRepository extends IProfileRepository {
  constructor() {
    super();
    this.cache = new Map();
  }

  /**
   * 根据会话ID获取客户画像
   * @param {string} conversationId - 会话ID
   * @returns {Promise<CustomerProfile>}
   */
  async getByConversationId(conversationId) {
    // 检查缓存
    if (this.cache.has(conversationId)) {
      return this.cache.get(conversationId);
    }

    let profileData = null;

    if (isApiEnabled()) {
      try {
        const response = await fetchProfile(conversationId);
        profileData = response?.data ?? response;
      } catch (err) {
        console.warn(`[CustomerProfileRepository] Failed to fetch profile from API: ${err.message}`);
      }
    }

    if (!profileData) {
      profileData = this._buildFallbackProfile(conversationId);
    }

    // 添加conversationId到数据中
    profileData.conversationId = conversationId;

    // 创建领域模型
    const profile = new CustomerProfile(profileData);

    // 缓存
    this.cache.set(conversationId, profile);

    return profile;
  }

  /**
   * 获取客户的互动记录
   * @param {string} conversationId - 会话ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>}
   */
  async getInteractions(conversationId, filters = {}) {
    if (isApiEnabled()) {
      try {
        const response = await fetchProfileInteractions(conversationId, {
          range: filters.range || '7d',
          type: filters.type,
        });
        const interactions = response?.data ?? response?.items ?? response;
        return Array.isArray(interactions) ? interactions : [];
      } catch (err) {
        console.warn(`[CustomerProfileRepository] Failed to fetch interactions: ${err.message}`);
        return [];
      }
    } else {
      return [];
    }
  }

  /**
   * 刷新客户画像
   * @param {string} conversationId - 会话ID
   * @returns {Promise<CustomerProfile>}
   */
  async refresh(conversationId) {
    // 清除缓存
    this.cache.delete(conversationId);

    if (isApiEnabled()) {
      try {
        await refreshProfile(conversationId);
      } catch (err) {
        console.warn(`[CustomerProfileRepository] Failed to refresh profile: ${err.message}`);
      }
    }

    // 重新获取
    return this.getByConversationId(conversationId);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 持久化客户画像（当前仅缓存）
   * @param {CustomerProfile} profile
   */
  async save(profile) {
    if (!profile || !profile.conversationId) {
      throw new Error('Invalid profile for save');
    }
    this.cache.set(profile.conversationId, profile);
    return profile;
  }

  /**
   * 根据客户ID加载画像（接口契约）
   * @param {string} customerId
   */
  async findById(customerId) {
    return this.getByConversationId(customerId);
  }

  /**
   * 构建默认画像（用于测试或API不可用场景）
   * @private
   */
  _buildFallbackProfile(conversationId) {
    return {
      conversationId,
      name: '客户',
      title: '',
      contacts: {
        phone: '-',
        email: '-',
      },
      sla: {},
      metrics: {},
      insights: [],
      interactions: [],
      conversationHistory: [],
      serviceRecords: [],
      commitments: [],
      history: [],
      contractRange: '',
    };
  }
}
