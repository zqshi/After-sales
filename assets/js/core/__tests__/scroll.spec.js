import { describe, it, expect, beforeEach } from 'vitest';
import { scrollToBottom } from '../scroll.js';

const defineReadonly = (el, prop, value) => {
  Object.defineProperty(el, prop, {
    configurable: true,
    get() {
      return value;
    },
    set() {},
  });
};

describe('scrollToBottom', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls to bottom when chat exists', () => {
    const chat = document.createElement('div');
    chat.id = 'chat-messages';
    defineReadonly(chat, 'scrollHeight', 500);
    chat.scrollTop = 0;
    document.body.appendChild(chat);

    scrollToBottom();

    expect(chat.scrollTop).toBe(500);
  });

  it('does nothing when chat missing', () => {
    expect(() => scrollToBottom()).not.toThrow();
  });
});
