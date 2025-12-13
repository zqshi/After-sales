"use strict";

/**
 * 安全的 localStorage 封装
 * 处理容量限制、异常情况和浏览器兼容性
 */

// 5MB 容量检查阈值
const STORAGE_WARNING_THRESHOLD = 5 * 1024 * 1024;

/**
 * 检查 localStorage 是否可用
 * @returns {boolean}
 */
function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('[storage] localStorage not available:', e.message);
    return false;
  }
}

/**
 * 获取当前存储使用量（字节）
 * @returns {number}
 */
function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * 安全存储数据到 localStorage
 * @param {string} key - 键名
 * @param {any} value - 值（会被序列化为 JSON）
 * @returns {boolean} 是否成功
 */
export function setItem(key, value) {
  if (!isStorageAvailable()) {
    console.error('[storage] localStorage not available, data not saved');
    return false;
  }

  try {
    const jsonString = JSON.stringify(value);
    const size = jsonString.length;

    // 检查容量
    const currentSize = getStorageSize();
    if (currentSize + size > STORAGE_WARNING_THRESHOLD) {
      console.warn('[storage] Storage size approaching limit:', {
        current: currentSize,
        adding: size,
        threshold: STORAGE_WARNING_THRESHOLD,
      });
    }

    localStorage.setItem(key, jsonString);
    return true;
  } catch (e) {
    console.error('[storage] Failed to save data:', e.message);

    // 如果是容量错误，尝试清理旧数据
    if (e.name === 'QuotaExceededError') {
      console.warn('[storage] Storage quota exceeded, attempting cleanup...');
      // 可以在这里实现清理策略
      // 例如：删除最旧的数据
    }

    return false;
  }
}

/**
 * 从 localStorage 安全读取数据
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值
 * @returns {any}
 */
export function getItem(key, defaultValue = null) {
  if (!isStorageAvailable()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }

    return JSON.parse(item);
  } catch (e) {
    console.error('[storage] Failed to parse data:', e.message);
    return defaultValue;
  }
}

/**
 * 从 localStorage 删除数据
 * @param {string} key - 键名
 * @returns {boolean} 是否成功
 */
export function removeItem(key) {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('[storage] Failed to remove item:', e.message);
    return false;
  }
}

/**
 * 清空 localStorage
 * @returns {boolean} 是否成功
 */
export function clear() {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch (e) {
    console.error('[storage] Failed to clear storage:', e.message);
    return false;
  }
}

/**
 * 获取存储统计信息
 * @returns {Object}
 */
export function getStorageInfo() {
  const size = getStorageSize();
  return {
    size,
    sizeKB: (size / 1024).toFixed(2),
    sizeMB: (size / 1024 / 1024).toFixed(2),
    itemCount: Object.keys(localStorage).length,
    available: isStorageAvailable(),
  };
}
