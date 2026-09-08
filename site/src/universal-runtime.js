import { createRegexBuilder } from './regex-builder.js';
import { openAppearanceEditor, registerAppearanceTarget } from './appearance.js';
import { createLock } from './toy-locks.js';
import { appendHistoryEvent } from './history.js';

export const UNIVERSAL_STORAGE_KEY = 'material-gitlab.universal.v1';
export const UNIVERSAL_SCHEMA_VERSION = 1;
export const DOWNLOAD_STATES = Object.freeze(['idle', 'confirming', 'downloading', 'complete', 'cancelled', 'failed']);

export const DEFAULT_UNIVERSAL_STATE = Object.freeze({
  schemaVersion: UNIVERSAL_SCHEMA_VERSION,
  displayName: 'Material GitLab',
  school: { enabled: false, name: 'Focus mode', credentialHash: '' },
  narrator: { enabled: false, language: 'en', englishVoice: 'auto', cantoneseVoice: 'auto', rate: 1, pitch: 1 },
  download: { state: 'idle', bytes: 0, total: 0, filename: '', error: '' },
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const text = (value) => String(value ?? '');
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const storeOf = (storage) => {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
};

export function normalizeUniversalState(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const school = source.school && typeof source.school === 'object' ? source.school : {};
  const narrator = source.narrator && typeof source.narrator === 'object' ? source.narrator : {};
  const download = source.download && typeof source.download === 'object' ? source.download : {};
  return {
    schemaVersion: UNIVERSAL_SCHEMA_VERSION,
    displayName: text(source.displayName || DEFAULT_UNIVERSAL_STATE.displayName).slice(0, 80),
    school: {
      enabled: Boolean(school.enabled),
      name: text(school.name || DEFAULT_UNIVERSAL_STATE.school.name).slice(0, 80),
      credentialHash: /^[a-f0-9]{64}$/i.test(text(school.credentialHash)) ? text(school.credentialHash).toLowerCase() : '',
    },
    narrator: {
      enabled: Boolean(narrator.enabled),
      language: ['en', 'zh-Hant', 'both'].includes(narrator.language) ? narrator.language : 'en',
      englishVoice: text(narrator.englishVoice || 'auto').slice(0, 256),
      cantoneseVoice: text(narrator.cantoneseVoice || 'auto').slice(0, 256),
      rate: Math.max(0.5, Math.min(2, Number(narrator.rate) || 1)),
      pitch: Math.max(0, Math.min(2, Number(narrator.pitch) || 1)),
    },
    download: {
      state: DOWNLOAD_STATES.includes(download.state) ? download.state : 'idle',
      bytes: Math.max(0, Number(download.bytes) || 0),
      total: Math.max(0, Number(download.total) || 0),
      filename: text(download.filename).slice(0, 180),
      error: text(download.error).slice(0, 500),
    },
  };
}

export function loadUniversalState(storage) {
  const store = storeOf(storage);
  try { return normalizeUniversalState(JSON.parse(store?.getItem(UNIVERSAL_STORAGE_KEY) || '{}')); }
  catch { return clone(DEFAULT_UNIVERSAL_STATE); }
}

export function saveUniversalState(value, storage) {
  const normalized = normalizeUniversalState(value);
  try { storeOf(storage)?.setItem(UNIVERSAL_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* local storage is best effort */ }
  return normalized;
}

export async function hashCredential(value) {
  const bytes = new TextEncoder().encode(text(value));
  if (bytes.length < 4 || bytes.length > 256) throw new Error('Use a local credential between 4 and 256 bytes.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function shouldShowDimSum(randomValue = Math.random(), firstRun = false, busy = false) {
  return !firstRun && !busy && Number(randomValue) >= 0 && Number(randomValue) < 0.1;
}

export function validateDownloadRequest(request = {}) {
  const filename = text(request.filename).trim();
  const source = text(request.source).trim();
  const destination = text(request.destination || 'Browser downloads').trim();
  if (!filename || filename.length > 180) throw new Error('Choose a bounded filename.');
  if (!source || source.length > 2048) throw new Error('The download source is missing or too long.');
  return { filename, source, destination };
}

export function createNarrationQueue(speech = globalThis.speechSynthesis) {
  const queue = [];
  let running = false;
  const next = () => {
    if (running || !speech || !queue.length || typeof SpeechSynthesisUtterance === 'undefined') return;
    running = true;
    const item = queue.shift();
    const utterance = new SpeechSynthesisUtterance(item.message);
    utterance.lang = item.lang;
    utterance.rate = item.rate;
    utterance.pitch = item.pitch;
    if (item.voice) utterance.voice = item.voice;
    utterance.onend = utterance.onerror = () => { running = false; next(); };
    speech.speak(utterance);
  };
  return {
    enqueue(item) {
      const category = text(item.category || 'general');
      const index = queue.findIndex((queued) => queued.category === category);
      const normalized = { ...item, category, message: text(item.message).slice(0, 2000) };
      if (index >= 0) queue[index] = normalized; else queue.push(normalized);
      next();
    },
    cancel() { queue.length = 0; speech?.cancel?.(); running = false; },
    pending() { return queue.length + Number(running); },
  };
}

export function filterOptions(options, query, { regex = false, flags = 'i' } = {}) {
  const value = text(query);
  let matcher;
  try { matcher = regex && value ? new RegExp(value, flags) : null; } catch (error) { return { error: error.message, matches: [] }; }
  const matches = [...options].filter((option) => !value || (matcher ? matcher.test(option.textContent) : option.textContent.toLocaleLowerCase().includes(value.toLocaleLowerCase())));
  return { error: '', matches };
}

function renderVoiceOptions(select, voices, languagePrefix, selected) {
  if (!select) return;
  const compatible = voices.filter((voice) => voice.lang?.toLocaleLowerCase().startsWith(languagePrefix));
  select.innerHTML = `<option value="auto">Choose automatically</option>${compatible.map((voice) => `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}${voice.localService ? '' : ' · network-backed'}</option>`).join('')}`;
  select.value = compatible.some((voice) => voice.voiceURI === selected) ? selected : 'auto';
}

function decorateSelect(select, root) {
  if (select.dataset.searchDecorated === 'true') return;
  select.dataset.searchDecorated = 'true';
  const shell = document.createElement('div');
  shell.className = 'select-search-shell';
  shell.innerHTML = `<label><span>Filter ${escapeHtml(select.getAttribute('aria-label') || select.closest('label')?.firstChild?.textContent || 'choices')}</span><input type="search" data-local-option-filter></label><button type="button" data-local-option-regex aria-expanded="false">Regex builder</button><div data-local-option-builder hidden></div><output aria-live="polite" data-local-option-status></output>`;
  select.insertAdjacentElement('afterend', shell);
  const input = shell.querySelector('[data-local-option-filter]');
  const builder = shell.querySelector('[data-local-option-builder]');
  const status = shell.querySelector('[data-local-option-status]');
  let regex = false;
  let flags = 'i';
  const update = () => {
    const result = filterOptions(select.options, input.value, { regex, flags });
    [...select.options].forEach((option) => { option.hidden = !result.matches.includes(option); });
    status.textContent = result.error || `${result.matches.length} choice${result.matches.length === 1 ? '' : 's'} visible.`;
  };
  createRegexBuilder({ root: builder, search: input, label: 'Choice filter regex builder', download: false, onChange: (state) => { regex = state.mode === 'regex'; flags = state.flags; input.value = state.pattern; update(); } });
  shell.querySelector('[data-local-option-regex]').addEventListener('click', (event) => { builder.hidden = !builder.hidden; event.currentTarget.setAttribute('aria-expanded', String(!builder.hidden)); if (!builder.hidden) builder.querySelector('textarea')?.focus(); });
  input.addEventListener('input', update);
  root.dispatchEvent(new CustomEvent('universal:select-decorated', { detail: { select } }));
}

function installContextMenu(root) {
  const menu = document.createElement('div');
  menu.className = 'universal-context-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `<label>Search this menu<input type="search" data-context-search></label><button type="button" data-context-regex aria-expanded="false">Regex builder</button><div data-context-builder hidden></div><button type="button" role="menuitem" data-context-appearance>Edit appearance… <kbd>Alt+Shift+A</kbd></button><button type="button" role="menuitem" data-context-lock>Lock this element…</button><output data-context-status aria-live="polite"></output>`;
  document.body.append(menu);
  const search = menu.querySelector('[data-context-search]');
  const builder = menu.querySelector('[data-context-builder]');
  createRegexBuilder({ root: builder, search, label: 'Context menu regex builder', download: false });
  let target = null;
  const filter = () => { const query = search.value.toLocaleLowerCase(); menu.querySelectorAll('[role="menuitem"]').forEach((item) => { item.hidden = Boolean(query && !item.textContent.toLocaleLowerCase().includes(query)); }); };
  search.addEventListener('input', filter);
  menu.querySelector('[data-context-regex]').addEventListener('click', (event) => { builder.hidden = !builder.hidden; event.currentTarget.setAttribute('aria-expanded', String(!builder.hidden)); });
  menu.querySelector('[data-context-appearance]').addEventListener('click', () => { if (target) openAppearanceEditor(target); menu.hidden = true; });
  menu.querySelector('[data-context-lock]').addEventListener('click', () => { if (target) { const id = target.dataset.appearanceTarget || `element-${Date.now().toString(36)}`; createLock({ target: id }); menu.querySelector('[data-context-status]').textContent = `Local toy lock created for ${id}.`; } });
  root.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.universal-context-menu')) return;
    event.preventDefault();
    target = event.target.closest('button,a,input,select,textarea,[data-appearance-target],article,section') || event.target;
    registerAppearanceTarget(target);
    menu.style.left = `${Math.min(event.clientX, window.innerWidth - 360)}px`;
    menu.style.top = `${Math.min(event.clientY, window.innerHeight - 420)}px`;
    menu.hidden = false;
    search.value = '';
    filter();
    search.focus();
  });
  root.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) { menu.hidden = true; target?.focus?.(); } });
  root.addEventListener('pointerdown', (event) => { if (!menu.hidden && !event.target.closest('.universal-context-menu')) menu.hidden = true; });
}

function installSuperConfirmation(root) {
  const dialog = root.querySelector('[data-super-confirmation]');
  if (!dialog) return;
  const keyA = dialog.querySelector('[data-super-key-a]');
  const keyB = dialog.querySelector('[data-super-key-b]');
  const slider = dialog.querySelector('[data-super-slider]');
  const commit = dialog.querySelector('[data-super-commit]');
  const progress = dialog.querySelector('[data-super-progress]');
  const sync = () => { slider.disabled = !(keyA.checked && keyB.checked); commit.disabled = slider.disabled || Number(slider.value) !== 100; progress.value = Number(slider.value); };
  root.querySelectorAll('[data-super-open]').forEach((button) => button.addEventListener('click', () => { keyA.checked = false; keyB.checked = false; slider.value = 0; sync(); dialog.showModal(); }));
  [keyA, keyB, slider].forEach((control) => control.addEventListener('input', sync));
  commit.addEventListener('click', () => { appendHistoryEvent('destructive action authorized', { surface: 'documentation site', credentialData: 'omitted' }); dialog.close('confirmed'); });
  dialog.querySelector('[data-super-cancel]').addEventListener('click', () => dialog.close('cancelled'));
  sync();
}

function installDownloadSurface(root, readState, writeState) {
  const start = root.querySelector('[data-download-start-dialog]');
  const active = root.querySelector('[data-download-active-dialog]');
  const complete = root.querySelector('[data-download-complete-dialog]');
  const status = root.querySelector('[data-download-status]');
  let timer = 0;
  const update = (patch) => { const state = writeState({ ...readState(), download: { ...readState().download, ...patch } }); const download = state.download; if (status) status.textContent = `${download.state}: ${download.bytes}/${download.total || 0} bytes${download.error ? `; ${download.error}` : ''}`; return download; };
  root.querySelector('[data-download-capture]')?.addEventListener('click', () => {
    const request = validateDownloadRequest({ filename: 'material-gitlab-site-state.json', source: 'browser-extension handoff equivalent', destination: 'Browser downloads' });
    start.querySelector('[data-download-proposal]').textContent = `${request.filename} from ${request.source} to ${request.destination}.`;
    update({ state: 'confirming', bytes: 0, total: 8192, filename: request.filename, error: '' });
    start.showModal();
  });
  start.querySelector('[data-download-confirm]')?.addEventListener('click', () => {
    start.close('confirmed'); active.showModal(); let bytes = 0; update({ state: 'downloading', bytes });
    const progress = active.querySelector('progress');
    timer = window.setInterval(() => {
      bytes = Math.min(8192, bytes + 1024); progress.value = bytes; update({ state: 'downloading', bytes });
      if (bytes === 8192) {
        clearInterval(timer); active.close('complete');
        const payload = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), source: 'Material GitLab documentation site' }, null, 2);
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' })); link.download = readState().download.filename; link.click(); URL.revokeObjectURL(link.href);
        update({ state: 'complete', bytes: 8192 }); complete.show();
      }
    }, 80);
  });
  start.querySelector('[data-download-cancel]')?.addEventListener('click', () => { start.close('cancelled'); update({ state: 'cancelled' }); });
  active.querySelector('[data-download-cancel]')?.addEventListener('click', () => { clearInterval(timer); active.close('cancelled'); update({ state: 'cancelled' }); });
  complete.querySelector('[data-download-dismiss]')?.addEventListener('click', () => complete.close());
}

export function initUniversalRuntime(root = document, options = {}) {
  let state = loadUniversalState(options.storage);
  const save = (next) => { state = saveUniversalState(next, options.storage); return state; };
  const narratorQueue = createNarrationQueue();
  const displayName = root.querySelector('[data-display-name]');
  const displayInput = root.querySelector('[data-display-name-input]');
  const schoolName = root.querySelector('[data-school-name]');
  const schoolToggle = root.querySelector('[data-school-toggle]');
  const schoolCredential = root.querySelector('[data-school-credential]');
  const schoolStatus = root.querySelector('[data-school-status]');
  const narratorEnabled = root.querySelector('[data-narrator-enabled]');
  const narratorLanguage = root.querySelector('[data-narrator-language]');
  const englishVoice = root.querySelector('[data-narrator-english-voice]');
  const cantoneseVoice = root.querySelector('[data-narrator-cantonese-voice]');
  const narratorRate = root.querySelector('[data-narrator-rate]');
  const narratorPitch = root.querySelector('[data-narrator-pitch]');
  const narratorStatus = root.querySelector('[data-narrator-status]');

  const render = () => {
    if (displayName) displayName.textContent = state.displayName;
    if (displayInput) displayInput.value = state.displayName;
    if (schoolName) schoolName.value = state.school.name;
    if (schoolToggle) schoolToggle.checked = state.school.enabled;
    if (narratorEnabled) narratorEnabled.checked = state.narrator.enabled;
    if (narratorLanguage) narratorLanguage.value = state.narrator.language;
    if (narratorRate) narratorRate.value = state.narrator.rate;
    if (narratorPitch) narratorPitch.value = state.narrator.pitch;
    root.documentElement.dataset.schoolMode = String(state.school.enabled);
    root.querySelectorAll('[data-school-sensitive]').forEach((element) => { element.hidden = state.school.enabled; });
    if (schoolStatus) schoolStatus.textContent = state.school.enabled ? `${state.school.name} is active. English-only presentation is forced locally.` : `${state.school.name} is inactive.`;
  };

  displayInput?.addEventListener('change', () => { save({ ...state, displayName: displayInput.value }); appendHistoryEvent('display name changed', { value: state.displayName }); render(); });
  root.querySelector('[data-display-name-reset]')?.addEventListener('click', () => { save({ ...state, displayName: DEFAULT_UNIVERSAL_STATE.displayName }); appendHistoryEvent('display name reset', { value: DEFAULT_UNIVERSAL_STATE.displayName }); render(); });
  schoolName?.addEventListener('change', () => { save({ ...state, school: { ...state.school, name: schoolName.value } }); appendHistoryEvent('focus mode renamed', { value: state.school.name }); render(); });
  schoolToggle?.addEventListener('change', async () => {
    try {
      if (schoolToggle.checked && !state.school.credentialHash) {
        const credentialHash = await hashCredential(schoolCredential.value);
        save({ ...state, school: { ...state.school, enabled: true, credentialHash } });
      } else if (!schoolToggle.checked) {
        if (!schoolCredential.value || await hashCredential(schoolCredential.value) !== state.school.credentialHash) throw new Error('The local unlock value did not match. Clear this site\'s data to reset it.');
        save({ ...state, school: { ...state.school, enabled: false } });
      } else save({ ...state, school: { ...state.school, enabled: true } });
      schoolCredential.value = ''; appendHistoryEvent('focus mode changed', { enabled: state.school.enabled, credential: 'omitted' }); render();
    } catch (error) { schoolToggle.checked = state.school.enabled; schoolStatus.textContent = error.message; }
  });

  const syncNarrator = () => {
    save({ ...state, narrator: { ...state.narrator, enabled: narratorEnabled?.checked, language: narratorLanguage?.value, englishVoice: englishVoice?.value, cantoneseVoice: cantoneseVoice?.value, rate: narratorRate?.value, pitch: narratorPitch?.value } });
    if (narratorStatus) narratorStatus.textContent = state.narrator.enabled ? 'Narrator is enabled locally; utterances are serialized.' : 'Narrator is off by default.';
  };
  [narratorEnabled, narratorLanguage, englishVoice, cantoneseVoice, narratorRate, narratorPitch].forEach((control) => control?.addEventListener('change', syncNarrator));
  const voicesChanged = () => { const voices = globalThis.speechSynthesis?.getVoices?.() || []; renderVoiceOptions(englishVoice, voices, 'en', state.narrator.englishVoice); renderVoiceOptions(cantoneseVoice, voices, 'zh', state.narrator.cantoneseVoice); if (narratorStatus && voices.length === 0) narratorStatus.textContent = 'No speech voices are currently available on this device.'; };
  voicesChanged(); globalThis.speechSynthesis?.addEventListener?.('voiceschanged', voicesChanged);
  root.querySelector('[data-narrator-test]')?.addEventListener('click', () => { if (!state.narrator.enabled) { narratorStatus.textContent = 'Enable narration before testing a voice.'; return; } const voices = globalThis.speechSynthesis?.getVoices?.() || []; const pick = (uri, prefix) => voices.find((voice) => voice.voiceURI === uri) || voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix)); const lines = state.narrator.language === 'both' ? [['This is the English narrator.', 'en-US', pick(state.narrator.englishVoice, 'en')], ['呢個係廣東話旁白。', 'zh-HK', pick(state.narrator.cantoneseVoice, 'zh')]] : state.narrator.language === 'zh-Hant' ? [['呢個係廣東話旁白。', 'zh-HK', pick(state.narrator.cantoneseVoice, 'zh')]] : [['This is the English narrator.', 'en-US', pick(state.narrator.englishVoice, 'en')]]; lines.forEach(([message, lang, voice]) => narratorQueue.enqueue({ category: lang, message, lang, voice, rate: state.narrator.rate, pitch: state.narrator.pitch })); });

  root.querySelectorAll('select').forEach((select) => decorateSelect(select, root));
  installContextMenu(root);
  installSuperConfirmation(root);
  installDownloadSurface(root, () => state, save);
  render();
  return { getState: () => clone(state), save, narratorQueue, destroy() { narratorQueue.cancel(); globalThis.speechSynthesis?.removeEventListener?.('voiceschanged', voicesChanged); } };
}

export default { normalizeUniversalState, loadUniversalState, saveUniversalState, hashCredential, shouldShowDimSum, validateDownloadRequest, createNarrationQueue, filterOptions, initUniversalRuntime };
