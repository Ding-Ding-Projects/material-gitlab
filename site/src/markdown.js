/* Minimal Markdown rendering for the bundled documentation articles.
 *
 * The articles are this repository's own files, but they are still rendered through one
 * shared, escaping renderer rather than injected raw. Supported: headings (h1 to h3),
 * bold, inline code, bullet lists, paragraphs, and inline links. A link becomes an anchor
 * only when its target is http(s) or a relative path; anything else, such as a script
 * scheme, stays as escaped text so the renderer can never be used to run code.
 */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

const SAFE_HREF = /^(?:https?:\/\/[^\s<>"']+|(?:\.{0,2}\/)?[A-Za-z0-9][A-Za-z0-9_./#?=&%-]*)$/;

function renderLinks(escaped) {
  // The input is already escaped, so a URL's ampersands read as &amp; here; that is the
  // correct form inside an href attribute.
  return escaped.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (match, label, href) => {
    if (!SAFE_HREF.test(href) || /^javascript:/i.test(href)) return match;
    const external = /^https?:\/\//.test(href);
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
}

/** True when the article opens with its own top-level heading, so a viewer must not add one. */
export function articleHasOwnTitle(markdown) {
  const firstLine = String(markdown ?? '').split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
  return /^# \S/.test(firstLine.trim());
}

export function markdownToHtml(markdown) {
  const html = escapeHtml(markdown)
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>')
    .replace(/(?:<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`);
  return renderLinks(html)
    .split(/\n{2,}/)
    .map((paragraph) => (/^(<h[234]|<ul>)/.test(paragraph.trim()) ? paragraph : `<p>${paragraph.replace(/\n/g, '<br>')}</p>`))
    .join('');
}
