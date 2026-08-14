/**
 * Local, per-element Material 3 appearance editor for the documentation site.
 * The state never leaves the browser: JSON import/export is explicit and bounded.
 */

export const APPEARANCE_SCHEMA_VERSION = 1;
export const APPEARANCE_STORAGE_KEY = 'material-gitlab.appearance.v1';
export const MAX_APPEARANCE_BYTES = 256 * 1024;
export const MAX_ELEMENTS = 500;
const MAX_PROPERTIES = 12;
const SAFE_ID = /^[A-Za-z0-9_.:-]{1,120}$/;
const COLORS = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/;
const NUMBERS = {
  fontSize: [8, 96], fontWeight: [100, 900], lineHeight: [0.8, 3],
  borderRadius: [0, 96], padding: [0, 160], margin: [0, 160],
  letterSpacing: [-8, 24], opacity: [0, 1],
};
const PROPERTY_TO_CSS = {
  color: ['color', (v) => v], backgroundColor: ['background-color', (v) => v],
  fontFamily: ['font-family', (v) => v], fontSize: ['font-size', (v) => `${v}px`],
  fontWeight: ['font-weight', (v) => String(v)], lineHeight: ['line-height', (v) => String(v)],
  borderRadius: ['border-radius', (v) => `${v}px`], padding: ['padding', (v) => `${v}px`],
  margin: ['margin', (v) => `${v}px`], letterSpacing: ['letter-spacing', (v) => `${v}px`],
  opacity: ['opacity', (v) => String(v)],
};

function storeOf(storage) { if (storage) return storage; try { return globalThis.localStorage; } catch { return null; } }
function bytes(value) { return new TextEncoder().encode(value).byteLength; }
function isRecord(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }

export function emptyAppearanceState() { return { schemaVersion: APPEARANCE_SCHEMA_VERSION, elements: {} }; }

export function validateAppearancePayload(payload) {
  const source = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (bytes(source) > MAX_APPEARANCE_BYTES) throw new Error('Appearance file exceeds the 256 KB limit.');
  let value; try { value = JSON.parse(source); } catch { throw new Error('Appearance file is not valid JSON.'); }
  if (!isRecord(value) || value.schemaVersion !== APPEARANCE_SCHEMA_VERSION || !isRecord(value.elements)) throw new Error('Unsupported appearance schema.');
  const ids = Object.keys(value.elements);
  if (ids.length > MAX_ELEMENTS) throw new Error('Appearance file contains too many elements.');
  const elements = {};
  for (const id of ids) {
    if (!SAFE_ID.test(id)) throw new Error('Appearance contains an unsafe element identifier.');
    const entry = value.elements[id];
    if (!isRecord(entry) || Object.keys(entry).length > MAX_PROPERTIES) throw new Error('Appearance element properties are invalid.');
    const normalized = {};
    for (const [key, raw] of Object.entries(entry)) {
      if (!Object.prototype.hasOwnProperty.call(PROPERTY_TO_CSS, key)) throw new Error(`Unsupported appearance property: ${key}`);
      if (key === 'color' || key === 'backgroundColor') { if (typeof raw !== 'string' || !COLORS.test(raw)) throw new Error(`Invalid ${key}.`); normalized[key] = raw; continue; }
      if (key === 'fontFamily') { if (typeof raw !== 'string' || !raw.trim() || raw.length > 160) throw new Error('Invalid font family.'); normalized[key] = raw.trim(); continue; }
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < NUMBERS[key][0] || raw > NUMBERS[key][1]) throw new Error(`Invalid ${key}.`);
      normalized[key] = raw;
    }
    elements[id] = normalized;
  }
  return { schemaVersion: APPEARANCE_SCHEMA_VERSION, elements };
}

export function loadAppearanceState(storage) {
  const raw = storeOf(storage)?.getItem(APPEARANCE_STORAGE_KEY);
  if (!raw) return emptyAppearanceState();
  try { return validateAppearancePayload(raw); } catch { return emptyAppearanceState(); }
}

export function saveAppearanceState(state, storage) {
  const normalized = validateAppearancePayload(state);
  try { storeOf(storage)?.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* private storage can be unavailable */ }
  return normalized;
}

export function applyAppearance(element, properties = {}) {
  if (!element?.style) return;
  for (const [key, [css, format]] of Object.entries(PROPERTY_TO_CSS)) {
    if (Object.prototype.hasOwnProperty.call(properties, key)) element.style.setProperty(css, format(properties[key]), '');
  }
}

export function resetAppearance(element, id, storage) {
  const state = loadAppearanceState(storage);
  if (id) delete state.elements[id];
  for (const [key, [css]] of Object.entries(PROPERTY_TO_CSS)) element?.style?.removeProperty(css);
  return saveAppearanceState(state, storage);
}

let state = null;
const targets = new Map();
let editor = null;

function targetId(element, requested) {
  const id = requested || element?.dataset?.appearanceTarget || element?.id;
  if (id && SAFE_ID.test(id)) return id;
  const generated = `element-${targets.size + 1}`;
  return generated;
}

function ensureEditor() {
  if (editor) return editor;
  editor = document.createElement('section');
  editor.className = 'appearance-editor'; editor.hidden = true; editor.setAttribute('aria-label', 'Edit appearance');
  editor.innerHTML = `<div class="appearance-editor__header"><h2>Edit appearance</h2><button type="button" data-appearance-close aria-label="Close appearance editor">×</button></div><p data-appearance-target-label></p><form data-appearance-form><div class="appearance-editor__grid"></div><div class="appearance-editor__actions"><button type="submit">Apply</button><button type="button" data-appearance-reset>Reset element</button><button type="button" data-appearance-export>Export</button><label class="appearance-editor__import">Import<input type="file" accept="application/json,.json" data-appearance-import /></label><button type="button" data-appearance-reset-all>Reset all</button></div><output data-appearance-status role="status" aria-live="polite"></output></form>`;
  document.body.append(editor);
  editor.querySelector('[data-appearance-close]').addEventListener('click', closeAppearanceEditor);
  editor.querySelector('[data-appearance-reset]').addEventListener('click', () => { if (editor.dataset.targetId) { const target = targets.get(editor.dataset.targetId); state = resetAppearance(target, editor.dataset.targetId); renderEditor(target, editor.dataset.targetId); } });
  editor.querySelector('[data-appearance-reset-all]').addEventListener('click', () => { state = saveAppearanceState(emptyAppearanceState()); targets.forEach((target) => Object.values(PROPERTY_TO_CSS).forEach(([css]) => target.style.removeProperty(css))); renderEditor(targets.get(editor.dataset.targetId), editor.dataset.targetId); status('All element appearance overrides reset.'); });
  editor.querySelector('[data-appearance-export]').addEventListener('click', exportAppearance);
  editor.querySelector('[data-appearance-import]').addEventListener('change', importAppearance);
  editor.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); applyForm(); });
  return editor;
}

function status(message) { const output = editor?.querySelector('[data-appearance-status]'); if (output) output.textContent = message; }
function fieldsFor(properties) {
  return Object.entries(PROPERTY_TO_CSS).map(([key]) => {
    const value = properties[key] ?? (key.includes('Color') || key === 'color' ? '#6750a4' : key === 'fontFamily' ? '' : key === 'opacity' ? 1 : '');
    const type = key.includes('Color') || key === 'color' ? 'color' : key === 'fontFamily' ? 'text' : 'number';
    const bounds = NUMBERS[key] ? ` min="${NUMBERS[key][0]}" max="${NUMBERS[key][1]}" step="${key === 'opacity' || key === 'lineHeight' ? '0.05' : '1'}"` : '';
    return `<label>${key}<input name="${key}" type="${type}" value="${String(value).replace(/"/g, '&quot;')}"${bounds} ${type === 'number' && value === '' ? 'placeholder="unchanged"' : ''}></label>`;
  }).join('');
}
function renderEditor(element, id) {
  if (!element || !editor) return;
  const properties = state.elements[id] || {};
  editor.dataset.targetId = id; editor.querySelector('[data-appearance-target-label]').textContent = `Target: ${id}`;
  editor.querySelector('.appearance-editor__grid').innerHTML = fieldsFor(properties);
}
function applyForm() {
  const id = editor?.dataset.targetId; const element = targets.get(id); if (!id || !element) return;
  const next = {}; editor.querySelectorAll('input[name]').forEach((input) => { if (input.value === '') return; next[input.name] = input.type === 'number' ? Number(input.value) : input.value; });
  try { state = saveAppearanceState({ ...state, elements: { ...state.elements, [id]: validateAppearancePayload({ schemaVersion: 1, elements: { [id]: next } }).elements[id] } }); applyAppearance(element, next); renderEditor(element, id); status('Appearance applied locally.'); } catch (error) { status(error.message); }
}
function closeAppearanceEditor() { if (!editor) return; editor.hidden = true; targets.get(editor.dataset.targetId)?.focus?.(); }
export function openAppearanceEditor(idOrElement) { const element = typeof idOrElement === 'string' ? targets.get(idOrElement) : idOrElement; if (!element) return false; const found = [...targets.entries()].find(([, value]) => value === element); const id = found ? found[0] : targetId(element); if (!found) registerAppearanceTarget(element, { id }); ensureEditor(); renderEditor(element, id); editor.hidden = false; editor.querySelector('input')?.focus(); return true; }
export function registerAppearanceTarget(element, options = {}) {
  if (!element || !element.addEventListener) return null;
  state ||= loadAppearanceState(); const id = targetId(element, options.id); targets.set(id, element); element.dataset.appearanceTarget = id; applyAppearance(element, state.elements[id]);
  element.setAttribute('tabindex', element.getAttribute('tabindex') || '0'); element.setAttribute('aria-keyshortcuts', 'Alt+Shift+A');
  element.addEventListener('dblclick', () => openAppearanceEditor(id)); element.addEventListener('keydown', (event) => { if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'a') { event.preventDefault(); openAppearanceEditor(id); } });
  return id;
}
export function exportAppearance() { const blob = new Blob([JSON.stringify(state || loadAppearanceState(), null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'material-gitlab-appearance.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 0); status('Appearance exported locally.'); }
async function importAppearance(event) { const file = event.target.files?.[0]; if (!file) return; try { const imported = validateAppearancePayload(await file.text()); state = saveAppearanceState(imported); targets.forEach((target, id) => applyAppearance(target, state.elements[id] || {})); renderEditor(targets.get(editor.dataset.targetId), editor.dataset.targetId); status('Appearance imported locally.'); } catch (error) { status(error.message); } event.target.value = ''; }

export function initAppearanceEditor(root = document) { state = loadAppearanceState(); root.querySelectorAll('[data-appearance-target]').forEach((element) => registerAppearanceTarget(element)); root.querySelectorAll('[data-edit-appearance]').forEach((button) => button.addEventListener('click', () => openAppearanceEditor(button.dataset.editAppearance))); return state; }

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => initAppearanceEditor());

export default { loadAppearanceState, saveAppearanceState, validateAppearancePayload, registerAppearanceTarget, openAppearanceEditor, applyAppearance, resetAppearance, initAppearanceEditor, exportAppearance };
