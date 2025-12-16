'use strict';

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

function buildQuery(params = {}) {
  const esc = encodeURIComponent;
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${esc(key)}=${esc(value)}`)
    .join('&');
  return query ? `?${query}` : '';
}

function getHeaders(custom = {}) {
  const auth = GLOBAL_CONFIG.authToken ? { Authorization: `Bearer ${GLOBAL_CONFIG.authToken}` } : {};
  return {
    ...DEFAULT_HEADERS,
    ...auth,
    ...custom,
  };
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带超时的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - fetch选项
 * @param {number} timeout - 超时时间（毫秒）
 */
async function fetchWithTimeout(url, options, timeout) {
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
 * 判断是否应该重试
 * @param {number} status - HTTP状态码
 * @param {number} retryCount - 当前重试次数
 */
function shouldRetry(status, retryCount) {
  return (
    retryCount < API_CONFIG.maxRetries &&
    API_CONFIG.retryStatusCodes.includes(status)
  );
}

/**
 * 计算重试延迟（指数退避）
 * @param {number} retryCount - 当前重试次数
 */
function getRetryDelay(retryCount) {
  return API_CONFIG.retryDelay * Math.pow(2, retryCount);
}

async function request(path, options = {}, retryCount = 0) {
  if (!IS_API_ENABLED) {
    throw new Error('API not configured');
  }

  const { params, timeout = API_CONFIG.timeout, ...rest } = options;
  const query = buildQuery(params);
  const url = `${API_BASE}${path}${query}`;

  let response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        ...rest,
        headers: getHeaders(rest.headers),
      },
      timeout,
    );
  } catch (err) {
    // 网络错误，尝试重试
    if (retryCount < API_CONFIG.maxRetries) {
      const retryDelay = getRetryDelay(retryCount);
      console.warn(`[api] Request failed, retrying in ${retryDelay}ms (${retryCount + 1}/${API_CONFIG.maxRetries})...`);
      await delay(retryDelay);
      return request(path, options, retryCount + 1);
    }
    throw new Error(`Network request failed: ${err.message}`);
  }

  const resultText = await response.text();

  // 安全解析 JSON，处理非 JSON 响应（如 HTML 错误页）
  let content = null;
  if (resultText) {
    try {
      content = JSON.parse(resultText);
    } catch (parseErr) {
      console.error('[api] Failed to parse response as JSON:', resultText.slice(0, 200));
      throw new Error(`Invalid JSON response from ${path}: ${parseErr.message}`);
    }
  }

  // 检查是否需要重试
  if (!response.ok) {
    if (shouldRetry(response.status, retryCount)) {
      const retryDelay = getRetryDelay(retryCount);
      console.warn(`[api] Request failed with status ${response.status}, retrying in ${retryDelay}ms (${retryCount + 1}/${API_CONFIG.maxRetries})...`);
      await delay(retryDelay);
      return request(path, options, retryCount + 1);
    }

    const errorMessage = content?.message || content?.error || response.statusText || 'Request failed';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = content;
    throw error;
  }

  return content;
}

async function safeRequest(path, options = {}) {
  try {
    return await request(path, options);
  } catch (err) {
    console.warn(`[api] request failed: ${path}`, err);
    throw err;
  }
}

export async function fetchConversations(params) {
  return safeRequest('/im/conversations', { params });
}

export async function fetchConversationMessages(conversationId, params) {
  return safeRequest(`/im/conversations/${conversationId}/messages`, { params });
}

export async function sendChatMessage(conversationId, payload) {
  return safeRequest(`/im/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateConversationStatus(conversationId, payload) {
  return safeRequest(`/im/conversations/${conversationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchProfile(customerId) {
  return safeRequest(`/profiles/${customerId}`);
}

export async function fetchProfileInteractions(customerId, params) {
  return safeRequest(`/profiles/${customerId}/interactions`, { params });
}

export async function refreshProfile(customerId) {
  return safeRequest(`/profiles/${customerId}/refresh`, { method: 'POST', body: JSON.stringify({}) });
}

export async function fetchRequirementData(params) {
  return safeRequest('/requirements', { params });
}

export async function createRequirement(payload) {
  return safeRequest('/requirements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function ignoreRequirement(requirementId) {
  return safeRequest(`/requirements/${requirementId}/ignore`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchRequirementStatistics() {
  return safeRequest('/requirements/statistics');
}

export async function fetchTasks(params) {
  return safeRequest('/tasks', { params });
}

export async function createTask(payload) {
  return safeRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function actionTask(taskId, action, payload = {}) {
  return safeRequest(`/tasks/${taskId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
}

export async function fetchQualityProfile(conversationId) {
  return safeRequest(`/quality/${conversationId}`);
}

export async function analyzeConversation(conversationId, context, model = 'gpt-4') {
  return safeRequest('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ conversationId, context, model }),
  });
}

export async function applySolution(solution) {
  return safeRequest('/ai/solutions', {
    method: 'POST',
    body: JSON.stringify(solution),
  });
}

export async function fetchKnowledge(params) {
  return safeRequest('/knowledge', { params });
}

export async function fetchKnowledgePreview(id) {
  return safeRequest(`/knowledge/${id}/preview`);
}

export async function fetchKnowledgeFull(id) {
  return safeRequest(`/knowledge/${id}/full`);
}

export async function fetchRoles() {
  return safeRequest('/session/roles');
}

export async function postAuditEvent(event) {
  return safeRequest('/audit/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export function isApiEnabled() {
  return IS_API_ENABLED;
}
