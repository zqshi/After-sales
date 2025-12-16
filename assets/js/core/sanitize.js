'use strict';

/**
 * HTML 转义工具 - 防止 XSS 攻击
 * 将特殊字符转义为 HTML 实体
 */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * 转义 HTML 特殊字符
 * @param {string} str - 待转义的字符串
 * @returns {string} 转义后的安全字符串
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * 安全设置文本内容（推荐使用）
 * @param {HTMLElement} element - 目标元素
 * @param {string} text - 文本内容
 */
export function setText(element, text) {
  if (!element) {
    return;
  }
  element.textContent = text;
}

/**
 * 安全设置 HTML 内容（仅在必要时使用，内容已转义）
 * @param {HTMLElement} element - 目标元素
 * @param {string} html - HTML 内容（应该是已转义或可信的）
 */
export function setHtml(element, html) {
  if (!element) {
    return;
  }
  // 警告：此方法应仅用于已转义或可信的 HTML
  element.innerHTML = html;
}

/**
 * 创建元素并安全设置内容
 * @param {string} tagName - 标签名
 * @param {Object} options - 配置选项
 * @param {string} options.text - 文本内容（安全）
 * @param {string} options.className - CSS 类名
 * @param {Object} options.attrs - 其他属性
 * @returns {HTMLElement}
 */
export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.className) {
    element.className = options.className;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

/**
 * 安全的模板字符串标签函数
 * 用法：safe`<div>${userInput}</div>`
 * 会自动转义 userInput
 */
export function safe(strings, ...values) {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    result += escapeHtml(String(values[i]));
    result += strings[i + 1];
  }

  return result;
}
