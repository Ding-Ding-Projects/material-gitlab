/** Presentation-only language helpers. Never translate user data or technical identifiers. */
export function normalizeLanguage(language) {
  if (['yue', 'yue-HK', 'yue-Hant-HK', 'zh-HK', 'zh-Hant'].includes(language)) return 'zh-Hant';
  return language === 'bilingual' ? 'bilingual' : 'en';
}

export function contentParts(value, language = 'en') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [{ lang: 'en', text: String(value ?? '') }];
  }
  const ownText = (key) => Object.hasOwn(value, key) && typeof value[key] === 'string' ? value[key] : undefined;
  const english = ownText('en');
  const cantonese = ownText('yue') ?? ownText('zh-Hant');
  const mode = normalizeLanguage(language);
  if (mode === 'bilingual' && english !== undefined && cantonese !== undefined && english !== cantonese) {
    return [{ lang: 'en', text: english }, { lang: 'yue', text: cantonese }].filter((part) => part.text !== '');
  }
  if (mode === 'bilingual' && english === cantonese && english !== undefined) return [{ lang: 'en', text: english }];
  if (mode !== 'en' && cantonese !== undefined) return [{ lang: 'yue', text: cantonese }];
  if (english !== undefined) return [{ lang: 'en', text: english }];
  if (cantonese !== undefined) return [{ lang: 'yue', text: cantonese }];
  return [{ lang: 'en', text: Object.values(value).find((entry) => typeof entry === 'string') ?? '' }];
}

export function localizedText(value, language = 'en') {
  return contentParts(value, language).map((part) => part.text).join(' / ');
}

/** Text nodes only: catalog values cannot inject markup. Language spans aid pronunciation. */
export function renderLocalizedText(element, value, language = 'en') {
  const document = element.ownerDocument;
  const parts = contentParts(value, language);
  element.replaceChildren();
  parts.forEach((part, index) => {
    if (index) element.append(document.createTextNode(' / '));
    const span = document.createElement('span');
    span.lang = part.lang;
    span.className = index ? 'm3-copy-secondary' : 'm3-copy-primary';
    span.textContent = part.text;
    element.append(span);
  });
}

let nextId = 0;
export function uniqueId(document, preferred) {
  let id = preferred;
  while (document.getElementById(id)) id = `${preferred}-${++nextId}`;
  return id;
}

export function describeWith(input, id) {
  const ids = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  ids.add(id);
  input.setAttribute('aria-describedby', [...ids].join(' '));
}

const fieldStates = new WeakMap();
const rootControllers = new WeakMap();

function localizeField(input, spec, document, language) {
  let state = fieldStates.get(input);
  if (!state) {
    if (!input.id) input.id = uniqueId(document, `material-field-${++nextId}`);
    const wrapper = input.closest('label') || input.parentElement;
    if (!wrapper) return;
    let label = input.labels?.[0] || input.closest('label');
    if (!label) {
      label = document.createElement('label');
      label.htmlFor = input.id;
      wrapper.insertBefore(label, input);
    }
    const labelCopy = document.createElement('span');
    labelCopy.className = 'm3-field__label';
    // Replace only the label's direct copy, not nested inputs, buttons, icons or help.
    const textNode = [...label.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim());
    if (textNode) label.replaceChild(labelCopy, textNode);
    else label.insertBefore(labelCopy, label.firstChild);
    const supporting = document.createElement('span');
    supporting.id = uniqueId(document, `${input.id}-supporting`);
    supporting.className = 'm3-field__supporting';
    wrapper.append(supporting);
    input.classList.add('m3-field__control');
    // Do not turn a shared navigation row into a single field container.
    if (wrapper.querySelectorAll('input,select,textarea').length === 1) wrapper.classList.add('m3-field');
    state = { labelCopy, supporting, lastSupporting: '' };
    fieldStates.set(input, state);
  }
  renderLocalizedText(state.labelCopy, spec.label, language);
  input.setAttribute('aria-label', localizedText(spec.label, language));
  if (input.type !== 'file') input.placeholder = localizedText(spec.placeholder, language);
  describeWith(input, state.supporting.id);
  // A feature may replace supporting copy with an error. Do not erase that error.
  if (state.supporting.textContent === state.lastSupporting) {
    renderLocalizedText(state.supporting, spec.supporting, language);
    state.lastSupporting = state.supporting.textContent;
  }
}

/** Follow the effective page mode (including schedules), without writing saved preferences. */
export function bindLocalizedFields(root, specs, selectors, language) {
  const existing = rootControllers.get(root);
  if (existing) {
    existing.setLanguage(language);
    return existing;
  }
  const document = root.nodeType === 9 ? root : root.ownerDocument;
  if (!document?.documentElement) throw new TypeError('A Document or an attached element is required');
  const page = document.documentElement;
  let explicitLanguage = language;
  let disposed = false;
  const render = () => {
    if (disposed) return;
    const effective = page.dataset.schoolMode === 'true' ? 'en' : explicitLanguage ?? page.dataset.language ?? page.lang;
    const mode = normalizeLanguage(effective);
    selectors.forEach(([selector, key]) => {
      const inputs = [...root.querySelectorAll(selector)];
      if (root.matches?.(selector)) inputs.unshift(root);
      inputs.forEach((input) => localizeField(input, specs[key], document, mode));
    });
  };
  const Observer = document.defaultView?.MutationObserver;
  const languageObserver = Observer ? new Observer(render) : null;
  languageObserver?.observe(page, { attributes: true, attributeFilter: ['data-language', 'data-school-mode', 'lang'] });
  const selector = selectors.map(([query]) => query).join(',');
  const contentObserver = Observer ? new Observer((records) => {
    // Ignore our own text spans. Revisit only added controls, not arbitrary user content.
    if (records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) render();
  }) : null;
  contentObserver?.observe(root, { childList: true, subtree: true });
  const controller = {
    refresh: render,
    setLanguage(next) { explicitLanguage = next; render(); },
    dispose() {
      disposed = true;
      languageObserver?.disconnect();
      contentObserver?.disconnect();
      rootControllers.delete(root);
    },
  };
  rootControllers.set(root, controller);
  render();
  return controller;
}
