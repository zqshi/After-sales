/**
 * API客户端 - 封装所有HTTP请求
 * 提供统一的接口调用、错误处理、重试机制、超时控制
 *
 * @example
 * import { apiClient } from '@/infrastructure/api/ApiClient.js';
 *
 * // GET请求
 * const conversations = await apiClient.get('/im/conversations', {
 *   params: { status: 'open', page: 1 }
 * });
 *
 * // POST请求
 * const message = await apiClient.post('/im/conversations/conv-123/messages', {
 *   content: 'Hello',
 *   messageType: 'text'
 * });
 */

const GLOBAL_CONFIG = window.config || {};
const API_BASE = GLOBAL_CONFIG.apiBaseUrl?.replace(/\/$/, '') || '';
const IS_API_ENABLED = Boolean(API_BASE);

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// API配置
const API_CONFIG = {
  timeout: 30000, // 30秒超时
  maxRetries: 3, // 最大重试次数
  retryDelay: 1000, // 重试延迟（毫秒）
  retryStatusCodes: [408, 429, 500, 502, 503, 504], // 可重试的状态码
};

/**
 * API客户端类
 */
export class ApiClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || API_BASE;
    this.timeout = config.timeout || API_CONFIG.timeout;
    this.maxRetries = config.maxRetries || API_CONFIG.maxRetries;
    this.retryDelay = config.retryDelay || API_CONFIG.retryDelay;
    this.retryStatusCodes = config.retryStatusCodes || API_CONFIG.retryStatusCodes;
    this.defaultHeaders = { ...DEFAULT_HEADERS, ...config.headers };
  }

  /**
   * GET请求
   * @param {string} path - API路径
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async get(path, options = {}) {
    return this.request(path, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST请求
   * @param {string} path - API路径
   * @param {Object} data - 请求体数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async post(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT请求
   * @param {string} path - API路径
   * @param {Object} data - 请求体数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async put(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH请求
   * @param {string} path - API路径
   * @param {Object} data - 请求体数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async patch(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE请求
   * @param {string} path - API路径
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  async delete(path, options = {}) {
    return this.request(path, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * 通用请求方法
   * @param {string} path - API路径
   * @param {Object} options - 请求选项
   * @param {number} retryCount - 当前重试次数
   * @returns {Promise<any>}
   */
  async request(path, options = {}, retryCount = 0) {
    if (!this.baseURL) {
      throw new Error('[ApiClient] API not configured, missing baseURL');
    }

    const { params, timeout = this.timeout, ...rest } = options;
    const query = this._buildQuery(params);
    const url = `${this.baseURL}${path}${query}`;

    let response;
    try {
      response = await this._fetchWithTimeout(
        url,
        {
          ...rest,
          headers: this._getHeaders(rest.headers),
        },
        timeout,
      );
    } catch (err) {
      // 网络错误,尝试重试
      if (retryCount < this.maxRetries) {
        const delay = this._getRetryDelay(retryCount);
        console.warn(
          `[ApiClient] Request failed, retrying in ${delay}ms (${retryCount + 1}/${this.maxRetries})...`,
        );
        await this._delay(delay);
        return this.request(path, options, retryCount + 1);
      }
      throw this._createError('Network request failed', err.message, 0, null);
    }

    const resultText = await response.text();

    // 安全解析JSON
    let content = null;
    if (resultText) {
      try {
        content = JSON.parse(resultText);
      } catch (parseErr) {
        console.error('[ApiClient] Failed to parse response as JSON:', resultText.slice(0, 200));
        throw this._createError(
          'Invalid JSON response',
          `Failed to parse response from ${path}`,
          response.status,
          null,
        );
      }
    }

    // 检查是否需要重试
    if (!response.ok) {
      if (this._shouldRetry(response.status, retryCount)) {
        const delay = this._getRetryDelay(retryCount);
        console.warn(
          `[ApiClient] Request failed with status ${response.status}, retrying in ${delay}ms (${retryCount + 1}/${this.maxRetries})...`,
        );
        await this._delay(delay);
        return this.request(path, options, retryCount + 1);
      }

      const errorMessage = content?.message || content?.error || response.statusText || 'Request failed';
      throw this._createError(errorMessage, errorMessage, response.status, content);
    }

    return content;
  }

  /**
   * 带超时的fetch请求
   * @private
   */
  async _fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw err;
    }
  }

  /**
   * 构建查询字符串
   * @private
   */
  _buildQuery(params = {}) {
    const esc = encodeURIComponent;
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${esc(key)}=${esc(value)}`)
      .join('&');
    return query ? `?${query}` : '';
  }

  /**
   * 获取请求头
   * @private
   */
  _getHeaders(customHeaders = {}) {
    const auth = GLOBAL_CONFIG.authToken
      ? { Authorization: `Bearer ${GLOBAL_CONFIG.authToken}` }
      : {};
    return {
      ...this.defaultHeaders,
      ...auth,
      ...customHeaders,
    };
  }

  /**
   * 判断是否应该重试
   * @private
   */
  _shouldRetry(status, retryCount) {
    return retryCount < this.maxRetries && this.retryStatusCodes.includes(status);
  }

  /**
   * 计算重试延迟（指数退避）
   * @private
   */
  _getRetryDelay(retryCount) {
    return this.retryDelay * Math.pow(2, retryCount);
  }

  /**
   * 延迟函数
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 创建标准化的错误对象
   * @private
   */
  _createError(message, details, status, response) {
    const error = new Error(message);
    error.details = details;
    error.status = status;
    error.response = response;
    return error;
  }

  /**
   * 检查API是否已启用
   */
  isEnabled() {
    return Boolean(this.baseURL);
  }

  /**
   * 获取单例实例
   * @returns {ApiClient} ApiClient 单例
   */
  static getInstance() {
    if (!ApiClient._instance) {
      ApiClient._instance = new ApiClient();
    }
    return ApiClient._instance;
  }
}

// 导出单例
export const apiClient = new ApiClient();
// 保存到静态属性
ApiClient._instance = apiClient;

// 导出工具函数(保持向后兼容)
export function isApiEnabled() {
  return IS_API_ENABLED;
}
