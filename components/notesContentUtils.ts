/**
 * Utilities for converting between plain text and HTML
 * for TenTap rich text editor and backward compatibility with legacy note content.
 */

const HTML_ENTITY: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ENTITY[c] ?? c);
}

/**
 * Detect if stored content is likely HTML (e.g. starts with < and ends with >).
 * Very simple heuristic; plain text rarely looks like this.
 */
export function isHtmlContent(content: string): boolean {
  const t = content.trim();
  return t.length > 0 && t.startsWith('<') && t.endsWith('>');
}

/**
 * Normalize content for TenTap: use as-is if HTML, otherwise wrap plain text in <p>.
 */
export function toEditorContent(stored: string): string {
  if (!stored || !stored.trim()) {
    return '';
  }
  if (isHtmlContent(stored)) {
    return stored;
  }
  const escaped = escapeHtml(stored);
  return `<p>${escaped.replace(/\n/g, '</p><p>')}</p>`;
}

/**
 * Optional: strip HTML to plain text for display (e.g. previews).
 * Simple tag stripping; not full HTML parsing.
 */
export function htmlToPlainText(html: string): string {
  if (!html || !html.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
