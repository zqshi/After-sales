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

export async function request(path, options = {}, retryCount = 0) {
  if (!IS_API_ENABLED) {
    throw new Error('API not configured');
  }

  const { params, timeout = API_CONFIG.timeout, ...rest } = options;
  const query = buildQuery(params);
  const url = `${API_BASE}${path}${query}`;

  let response;
  try {
    const headers = getHeaders(rest.headers);
    if (rest.body instanceof FormData) {
      delete headers['Content-Type'];
    } else if (rest.body === undefined || rest.body === null || rest.body === '') {
      delete headers['Content-Type'];
    }
    response = await fetchWithTimeout(
      url,
      {
        ...rest,
        headers,
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

    const errorMessage =
      (typeof content?.message === 'string' && content.message) ||
      (typeof content?.error === 'string' && content.error) ||
      (typeof content?.error?.message === 'string' && content.error.message) ||
      response.statusText ||
      'Request failed';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = content;
    throw error;
  }

  return content;
}

export async function safeRequest(path, options = {}) {
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

export async function fetchConversationStats(params) {
  return safeRequest('/im/conversations/stats', { params });
}

export async function sendChatMessage(conversationId, payload) {
  return safeRequest(`/im/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendIncomingMessage(payload) {
  return safeRequest('/im/incoming-message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitAgentReview(payload) {
  return safeRequest('/im/reviews/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchConversationProblems(conversationId) {
  return safeRequest(`/im/conversations/${conversationId}/problems`);
}

/**
 * 设置会话Agent模式
 */
export async function setConversationMode(conversationId, mode) {
  return safeRequest(`/im/conversations/${conversationId}/mode`, {
    method: 'PATCH',
    body: JSON.stringify({ mode }),
  });
}

export async function updateConversationStatus(conversationId, payload) {
  return safeRequest(`/im/conversations/${conversationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchProfile(customerId) {
  return safeRequest(`/api/customers/${customerId}`);
}

export async function fetchProfileInteractions(customerId, params) {
  return safeRequest(`/api/customers/${customerId}/interactions`, { params });
}

export async function refreshProfile(customerId) {
  return safeRequest(`/api/customers/${customerId}/refresh`, { method: 'POST', body: JSON.stringify({}) });
}

export async function fetchConversationAiAnalysis(conversationId) {
  return safeRequest(`/im/conversations/${conversationId}/ai-analysis`);
}

export async function fetchRequirementData(params) {
  return safeRequest('/api/requirements', { params });
}

export async function createRequirement(payload) {
  return safeRequest('/api/requirements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function ignoreRequirement(requirementId) {
  return safeRequest(`/api/requirements/${requirementId}/ignore`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchRequirementStatistics() {
  return safeRequest('/api/requirements/statistics');
}

export async function fetchTasks(params) {
  return safeRequest('/api/tasks', { params });
}

export async function createTask(payload) {
  return safeRequest('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function actionTask(taskId, action, payload = {}) {
  return safeRequest(`/api/tasks/${taskId}/actions`, {
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

/**
 * 获取对话情绪分析
 * @param {string} conversationId - 对话ID
 * @returns {Promise<Object>} 情绪分析结果
 */
export async function fetchSentimentAnalysis(conversationId) {
  return safeRequest(`/im/conversations/${conversationId}/sentiment`);
}

export async function applySolution(solution) {
  return safeRequest('/ai/solutions', {
    method: 'POST',
    body: JSON.stringify(solution),
  });
}

export async function fetchKnowledge(params) {
  return safeRequest('/api/knowledge', { params });
}

export async function fetchKnowledgePreview(id) {
  return safeRequest(`/api/knowledge/${id}`);
}

export async function fetchKnowledgeFull(id) {
  return safeRequest(`/api/knowledge/${id}`);
}

export async function fetchKnowledgeProgress(id) {
  return safeRequest(`/api/knowledge/${id}/progress`);
}

export async function syncKnowledgeItem(id, payload = {}) {
  return safeRequest(`/api/knowledge/${id}/sync`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function retryKnowledgeUpload(id) {
  return safeRequest(`/api/knowledge/${id}/retry`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function searchKnowledge(payload) {
  return safeRequest('/api/knowledge/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createKnowledgeItem(payload) {
  return safeRequest('/api/knowledge', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateKnowledgeItem(id, payload) {
  return safeRequest(`/api/knowledge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeItem(id, params = {}) {
  return safeRequest(`/api/knowledge/${id}`, {
    method: 'DELETE',
    params,
  });
}

export async function uploadKnowledgeDocument(formData) {
  return safeRequest('/api/knowledge/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchRoles() {
  return safeRequest('/session/roles');
}

export async function fetchSessionPermissions() {
  return safeRequest('/session/permissions');
}

export async function fetchRoleList() {
  return safeRequest('/api/roles');
}

export async function createRole(payload) {
  return safeRequest('/api/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRole(roleId, payload) {
  return safeRequest(`/api/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteRole(roleId) {
  return safeRequest(`/api/roles/${roleId}`, {
    method: 'DELETE',
  });
}

export async function fetchMembers() {
  return safeRequest('/api/members');
}

export async function createMember(payload) {
  return safeRequest('/api/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMember(memberId, payload) {
  return safeRequest(`/api/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteMember(memberId) {
  return safeRequest(`/api/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function fetchCurrentUser() {
  return safeRequest('/api/auth/me');
}

export async function fetchAuditSummary(days = 7) {
  return safeRequest('/audit/reports/summary', { params: { days } });
}

export async function fetchMonitoringAlerts(status) {
  return safeRequest('/monitoring/alerts', { params: { status } });
}

export async function createMonitoringAlert(payload) {
  return safeRequest('/monitoring/alerts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resolveMonitoringAlert(alertId) {
  return safeRequest(`/monitoring/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
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
