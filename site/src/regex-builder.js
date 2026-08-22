/**
 * DOM-light, anchored ECMAScript regex builder.  Each search input can own an
 * instance; no network or shared mutable state is used.  The factory renders
 * a full builder into an adjacent container and returns a small controller.
 */

export const REGEX_LIMITS = Object.freeze({ patternBytes: 4096, sampleBytes: 65536, matches: 200, captureGroups: 64 });
export const REGEX_FLAGS = Object.freeze(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
const TOKEN_VALUES = Object.freeze({
  literal: '', class: '[]', anchor: '^', group: '()', alternation: '|', quantifier: '*',
});
const encoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;
const bytes = (value) => encoder ? encoder.encode(String(value)).byteLength : String(value).length;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const clone = (value) => JSON.parse(JSON.stringify(value));

export function validateRegexInput(pattern, flags = '', sample = '') {
  const normalizedFlags = String(flags || '').trim();
  if (bytes(pattern) > REGEX_LIMITS.patternBytes) return { ok: false, error: `Pattern exceeds ${REGEX_LIMITS.patternBytes} bytes.` };
  if (bytes(sample) > REGEX_LIMITS.sampleBytes) return { ok: false, error: `Sample exceeds ${REGEX_LIMITS.sampleBytes} bytes.` };
  const seen = new Set();
  for (const flag of normalizedFlags) {
    if (!REGEX_FLAGS.includes(flag)) return { ok: false, error: `Unsupported flag: ${flag}.` };
    if (seen.has(flag)) return { ok: false, error: `Duplicate flag: ${flag}.` };
    seen.add(flag);
  }
  const groups = (String(pattern).match(/(?<!\\)\((?!\?)/g) || []).length;
  if (groups > REGEX_LIMITS.captureGroups) return { ok: false, error: `Pattern has more than ${REGEX_LIMITS.captureGroups} capture groups.` };
  try { return { ok: true, regex: new RegExp(String(pattern), normalizedFlags), flags: normalizedFlags }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Invalid pattern.' }; }
}

export function evaluateRegex(pattern, flags, sample, limits = REGEX_LIMITS) {
  const checked = validateRegexInput(pattern, flags, sample);
  if (!checked.ok) return { ...checked, matches: [], captures: [] };
  const matches = []; const captures = []; const text = String(sample ?? '');
  const regex = checked.regex;
  if (!regex.global && !regex.sticky) {
    const match = regex.exec(text);
    if (match) { matches.push({ value: match[0], index: match.index, end: match.index + match[0].length }); captures.push(Array.from(match).map((v) => v ?? '')); }
    return { ok: true, regex, matches, captures };
  }
  let count = 0; let match;
  while ((match = regex.exec(text)) && count < limits.matches) {
    matches.push({ value: match[0], index: match.index, end: match.index + match[0].length });
    captures.push(Array.from(match).map((v) => v ?? '')); count += 1;
    if (match[0] === '') regex.lastIndex += 1;
  }
  return { ok: true, regex, matches, captures, truncated: Boolean(match) };
}

export function createRegexBuilder(options = {}) {
  const search = options.search || null;
  const root = options.root || document.createElement('div');
  const initial = options.state || {};
  const state = { mode: initial.mode === 'regex' ? 'regex' : 'text', pattern: String(initial.pattern || ''), flags: String(initial.flags || 'i'), sample: String(initial.sample || ''), ...initial };
  const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
  root.classList.add('regex-builder');
  root.setAttribute('role', 'region'); root.setAttribute('aria-label', options.label || 'Regex builder');
  const radioName = `regex-mode-${Math.random().toString(36).slice(2)}`;
  root.innerHTML = `<div class="regex-builder__row regex-builder__mode"><label><input type="radio" name="${radioName}" value="text"> Plain text</label><label><input type="radio" name="${radioName}" value="regex"> Regular expression</label></div><div class="regex-builder__pattern"><label for="regex-pattern">Pattern</label><textarea id="regex-pattern" data-regex-pattern maxlength="4096" spellcheck="false"></textarea></div><div class="regex-builder__row"><label for="regex-flags">Flags</label><input id="regex-flags" data-regex-flags maxlength="8" inputmode="text" value="i"><span class="regex-builder__summary" data-regex-engine>ECMAScript RegExp</span></div><div><span>Guided tokens</span><div class="regex-builder__token-list" data-regex-tokens></div></div><div class="regex-builder__pattern"><label for="regex-sample">Sample text</label><textarea id="regex-sample" data-regex-sample maxlength="65536"></textarea></div><div class="regex-builder__feedback" data-regex-feedback aria-live="polite"></div><ol class="regex-builder__matches" data-regex-matches aria-live="polite"></ol><div class="regex-builder__row"><button type="button" data-regex-copy>Copy pattern</button><button type="button" data-regex-export>Export JSON</button></div>`;
  const pattern = root.querySelector('[data-regex-pattern]'); const flags = root.querySelector('[data-regex-flags]'); const sample = root.querySelector('[data-regex-sample]'); const feedback = root.querySelector('[data-regex-feedback]'); const matches = root.querySelector('[data-regex-matches]');
  pattern.value = state.pattern; flags.value = state.flags; sample.value = state.sample; root.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = input.value === state.mode; });
  const tokenHost = root.querySelector('[data-regex-tokens]');
  Object.entries(TOKEN_VALUES).forEach(([id, value]) => { const button = document.createElement('button'); button.type = 'button'; button.dataset.token = id; button.textContent = id === 'class' ? 'Character class []' : id[0].toUpperCase() + id.slice(1); button.addEventListener('click', () => { const start = pattern.selectionStart ?? pattern.value.length; pattern.value = `${pattern.value.slice(0, start)}${value}${pattern.value.slice(pattern.selectionEnd ?? start)}`; pattern.selectionStart = pattern.selectionEnd = start + value.length; update(); }); tokenHost.append(button); });
  function update() { state.mode = root.querySelector('input[type="radio"]:checked')?.value || 'text'; state.pattern = pattern.value; state.flags = flags.value; state.sample = sample.value; const plainIndex = state.sample ? state.sample.toLocaleLowerCase().indexOf(state.pattern.toLocaleLowerCase()) : -1; const result = state.mode === 'regex' ? evaluateRegex(state.pattern, state.flags, state.sample) : { ok: true, matches: state.pattern && plainIndex >= 0 ? [{ value: state.sample.slice(plainIndex, plainIndex + state.pattern.length), index: plainIndex, end: plainIndex + state.pattern.length }] : [], captures: [] }; feedback.dataset.state = result.ok ? 'ok' : 'error'; feedback.textContent = result.ok ? (result.truncated ? 'Valid pattern; match list truncated.' : 'Pattern ready.') : result.error; matches.innerHTML = result.matches?.length ? result.matches.map((item, index) => `<li class="regex-builder__match"><code>#${index + 1} ${escapeHtml(item.value)}</code> · ${item.index}–${item.end}${result.captures?.[index]?.length > 1 ? ` · captures: ${escapeHtml(result.captures[index].slice(1).join(' · '))}` : ''}</li>`).join('') : '<li class="regex-builder__empty">No matches in sample text.</li>'; if (search && state.mode === 'regex') search.dataset.regexPattern = state.pattern; onChange(clone(state), result); }
  [pattern, flags, sample, ...root.querySelectorAll('input[type="radio"]')].forEach((control) => control.addEventListener('input', update));
  root.querySelector('[data-regex-copy]').addEventListener('click', async () => { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(state.pattern); options.onCopy?.(state.pattern); });
  root.querySelector('[data-regex-export]').addEventListener('click', () => { const payload = JSON.stringify({ schemaVersion: 1, engine: 'ECMAScript RegExp', ...state }, null, 2); options.onExport?.(payload); if (options.download !== false) { const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'regex-pattern.json'; link.click(); URL.revokeObjectURL(url); } });
  update();
  return { root, getState: () => clone(state), setState(next = {}) { Object.assign(state, next); pattern.value = state.pattern || ''; flags.value = state.flags || 'i'; sample.value = state.sample || ''; root.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = input.value === state.mode; }); update(); }, evaluate: () => evaluateRegex(state.pattern, state.flags, state.sample), destroy() { root.replaceChildren(); } };
}

export function bindRegexBuilder(search, builder, toggle) {
  if (!search || !builder) return () => {};
  const show = () => { builder.hidden = false; toggle?.setAttribute('aria-expanded', 'true'); builder.querySelector('textarea,input')?.focus(); };
  const hide = () => { builder.hidden = true; toggle?.setAttribute('aria-expanded', 'false'); };
  toggle?.addEventListener('click', () => builder.hidden ? show() : hide());
  search.addEventListener('keydown', (event) => { if (event.altKey && event.key.toLowerCase() === 'r') { event.preventDefault(); show(); } });
  return () => { toggle?.replaceWith(toggle.cloneNode(true)); search.replaceWith(search.cloneNode(true)); };
}
