/**
 * Customer Profile Repository
 * 客户画像数据仓储
 *
 * DDD: Repository - 负责数据持久化和检索
 */

import { CustomerProfile } from '../models/Profile.js';
import { fetchProfile, fetchProfileInteractions, refreshProfile, isApiEnabled } from '../../../api.js';

export class ProfileRepository {
  constructor(mockDataProvider = null) {
    this.mockDataProvider = mockDataProvider;
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

    // 如果API可用，优先从API获取
    if (isApiEnabled()) {
      try {
        const response = await fetchProfile(conversationId);
        profileData = response?.data ?? response;
      } catch (err) {
        console.warn(`[ProfileRepository] Failed to fetch profile from API: ${err.message}`);
        // API失败，回退到Mock数据
        profileData = this._getMockProfile(conversationId);
      }
    } else {
      // API未配置，使用Mock数据
      profileData = this._getMockProfile(conversationId);
    }

    if (!profileData) {
      throw new Error(`Profile not found for conversation: ${conversationId}`);
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
        console.warn(`[ProfileRepository] Failed to fetch interactions: ${err.message}`);
        // 回退到画像中的互动数据
        const profile = await this.getByConversationId(conversationId);
        return profile.interactions.filter(i => {
          if (filters.range && filters.range !== '全部') {
            if (i.window !== filters.range) {
              return false;
            }
          }
          if (filters.type && filters.type !== '全部') {
            if (i.type !== filters.type) {
              return false;
            }
          }
          return true;
        });
      }
    } else {
      // 使用Mock数据中的互动
      const profile = await this.getByConversationId(conversationId);
      return profile.interactions.filter(i => {
        if (filters.range && filters.range !== '全部') {
          if (i.window !== filters.range) {
            return false;
          }
        }
        if (filters.type && filters.type !== '全部') {
          if (i.type !== filters.type) {
            return false;
          }
        }
        return true;
      });
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
        console.warn(`[ProfileRepository] Failed to refresh profile: ${err.message}`);
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
   * 从Mock数据提供者获取数据
   * @private
   */
  _getMockProfile(conversationId) {
    if (!this.mockDataProvider) {
      return null;
    }

    const mockData = this.mockDataProvider.getProfile(conversationId);
    return mockData;
  }
}
