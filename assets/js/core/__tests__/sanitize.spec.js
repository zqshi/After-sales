import { describe, it, expect } from 'vitest';
import { escapeHtml, setText, setHtml, createElement, safe } from '../sanitize.js';

describe('sanitize', () => {
  it('escapes html characters', () => {
    expect(escapeHtml('<script>"&\'/' )).toBe('&lt;script&gt;&quot;&amp;&#x27;&#x2F;');
    expect(escapeHtml('plain')).toBe('plain');
    expect(escapeHtml(123)).toBe(123);
  });

  it('sets text and html safely', () => {
    const el = document.createElement('div');
    setText(el, '<b>hi</b>');
    expect(el.textContent).toBe('<b>hi</b>');
    setHtml(el, '&lt;b&gt;ok&lt;/b&gt;');
    expect(el.innerHTML).toBe('&lt;b&gt;ok&lt;/b&gt;');

    expect(() => setText(null, 'x')).not.toThrow();
    expect(() => setHtml(null, 'x')).not.toThrow();
  });

  it('creates element with options', () => {
    const el = createElement('span', {
      text: 'hello',
      className: 'greeting',
      attrs: { 'data-id': '123', role: 'note' },
    });
    expect(el.tagName).toBe('SPAN');
    expect(el.textContent).toBe('hello');
    expect(el.className).toBe('greeting');
    expect(el.getAttribute('data-id')).toBe('123');
    expect(el.getAttribute('role')).toBe('note');
  });

  it('builds safe template strings', () => {
    const userInput = '<img src=x onerror=alert(1)>';
    const result = safe`<div>${userInput}</div>`;
    expect(result).toBe('<div>&lt;img src=x onerror=alert(1)&gt;</div>');
  });
});
