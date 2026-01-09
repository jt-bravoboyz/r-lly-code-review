/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this when inserting user-controlled data into innerHTML.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Creates a safe text element without using innerHTML.
 * This is the preferred method for displaying user content.
 */
export function createSafeTextElement(
  tagName: keyof HTMLElementTagNameMap,
  text: string | null | undefined,
  className?: string
): HTMLElement {
  const el = document.createElement(tagName);
  if (className) {
    el.className = className;
  }
  el.textContent = text || '';
  return el;
}
