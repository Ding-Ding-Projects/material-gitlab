/* Product copy and Material 3 field hooks for the Material GitLab site. */

const COPY = new Map([
  ['title', 'Material GitLab · Product guide'],
  ['.brand-copy strong', 'Material GitLab'],
  ['.brand-copy small', 'Product guide for focused delivery'],
  ['.top-nav a[href="#overview"]', 'Product'],
  ['.top-nav a[href="#guides"]', 'Guides'],
  ['.top-nav a[href="#reference"]', 'Reference'],
  ['.site-search input', 'Search the product guide'],
  ['.hero .eyebrow', 'Material GitLab · product guide'],
  ['.hero h1', 'Ship a clearer GitLab experience.'],
  ['.hero-lede', 'A practical guide to the Material GitLab product: discover the shell, configure the workspace, and keep delivery moving.'],
  ['.hero-actions a[href="#guides"]', 'Open the guides'],
  ['.hero-actions a[href="#reference"]', 'Browse the reference'],
  ['.hero-card .card-kicker', 'Start with the product'],
  ['.hero-card h2', 'Choose the next useful action'],
  ['.hero-card p', 'Use the overview to orient the product, then open a focused guide for the work at hand.'],
  ['.hero-card .text-link', 'Open the guide library'],
  ['#guides .eyebrow', 'Product guides'],
  ['#guides h2', 'Guides for building with Material GitLab'],
  ['#guides .section-heading .text-link', 'View all guides'],
  ['#reference .eyebrow', 'Product reference'],
  ['#reference h2', 'A dependable system for everyday delivery'],
  ['#settings .eyebrow', 'Reading preferences'],
  ['#settings h2', 'Tune the guide to your workflow'],
  ['#library .eyebrow', 'Product library'],
  ['#library h2', 'Feature inventory and documentation'],
  ['#tools .eyebrow', 'Product tools'],
  ['#tools h2', 'Inspect and configure the site locally'],
  ['.site-footer > span:first-child', 'Material GitLab'],
  ['.site-footer > span:nth-child(2)', 'Built for focused delivery'],
  ['.site-footer .text-link', 'Open the product library'],
]);

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
].join(', ');

function replaceElementText(element, value) {
  if (!element) return;
  const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (textNode) {
    textNode.textContent = ` ${value} `;
  } else {
    element.textContent = value;
  }
}

function applyCopy(root = document) {
  const title = root.querySelector('title');
  if (title) title.textContent = COPY.get('title');
  COPY.forEach((value, selector) => {
    if (selector === 'title') return;
    root.querySelectorAll(selector).forEach((element) => {
      if (element.matches('input')) element.setAttribute('placeholder', value);
      else replaceElementText(element, value);
    });
  });
}

function ensureFieldId(field, index) {
  if (field.id) return field.id;
  const name = field.getAttribute('name') || field.dataset.preference || field.type || 'field';
  const id = `md3-${name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-${index}`;
  field.id = id;
  return id;
}

function applyTextFieldSemantics(root = document) {
  root.querySelectorAll(FIELD_SELECTOR).forEach((field, index) => {
    field.classList.add('md3-text-field__control');
    field.setAttribute('data-md3-field', 'true');
    const id = ensureFieldId(field, index);
    const label = field.closest('label');
    if (label) {
      label.classList.add('md3-text-field');
      label.setAttribute('data-md3-text-field', 'true');
      if (!label.querySelector(`:scope > .md3-text-field__label`)) {
        const labelText = Array.from(label.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.trim())
          .join(' ')
          .trim();
        if (labelText) {
          const labelNode = document.createElement('span');
          labelNode.className = 'md3-text-field__label';
          labelNode.textContent = labelText;
          label.insertBefore(labelNode, field);
          Array.from(label.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .forEach((node) => node.remove());
        }
      }
      const labelNode = label.querySelector(':scope > .md3-text-field__label');
      if (labelNode) labelNode.setAttribute('for', id);
    } else if (!field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')) {
      const hint = field.getAttribute('placeholder') || field.getAttribute('name') || field.type || 'Field';
      field.setAttribute('aria-label', hint);
      field.classList.add('md3-text-field--standalone');
    }
  });
}

export function initProductContent(root = document) {
  applyCopy(root);
  applyTextFieldSemantics(root);
}

if (typeof document !== 'undefined') {
  const run = () => initProductContent(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  document.addEventListener('material-site-ready', run);
}
