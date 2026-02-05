/**
 * 核心工具函数
 */

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * HTML转义
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的安全HTML
 */
export function escapeHtml(text) {
  if (!text) {
    return '';
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
