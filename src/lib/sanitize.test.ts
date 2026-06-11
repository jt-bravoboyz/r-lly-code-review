import { describe, it, expect } from 'vitest';
import { escapeHtml, createSafeTextElement } from './sanitize';

describe('escapeHtml', () => {
  it('escapes < > & " characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert("x")&lt;/script&gt;'
    );
  });
  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  it('passes plain text through', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('createSafeTextElement', () => {
  it('sets textContent (no HTML parsing)', () => {
    const el = createSafeTextElement('span', '<b>x</b>', 'foo');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('foo');
    expect(el.textContent).toBe('<b>x</b>');
    expect(el.querySelector('b')).toBeNull();
  });
  it('handles null text', () => {
    const el = createSafeTextElement('div', null);
    expect(el.textContent).toBe('');
  });
});
