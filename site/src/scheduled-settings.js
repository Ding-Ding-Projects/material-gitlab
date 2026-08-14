/** Local scheduled settings engine. Rules are persisted in localStorage only. */
export const SCHEDULE_SCHEMA_VERSION = 1;
export const SCHEDULE_STORAGE_KEY = 'material-gitlab.scheduled-settings.v1';
export const MAX_RULES = 64;
export const MAX_LABEL_LENGTH = 120;
const SOURCES = new Set(['local']);

const storeOf = (storage) => storage || (() => { try { return globalThis.localStorage; } catch { return null; } })();
const boundedString = (value, fallback = '') => typeof value === 'string' && value.length <= MAX_LABEL_LENGTH ? value : fallback;
const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const validDate = (value) => value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));

export function normalizeRule(rule = {}, index = 0) {
  const source = rule && typeof rule === 'object' ? rule : {};
  const weekdays = Array.isArray(source.weekdays) ? [...new Set(source.weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))] : [];
  const values = source.values && typeof source.values === 'object' && !Array.isArray(source.values) ? { ...source.values } : {};
  return {
    id: boundedString(source.id, `rule-${index + 1}`) || `rule-${index + 1}`,
    label: boundedString(source.label, `Schedule ${index + 1}`),
    enabled: source.enabled !== false,
    priority: Number.isFinite(Number(source.priority)) ? Math.max(-1000, Math.min(1000, Number(source.priority))) : 0,
    startDate: validDate(source.startDate) ? source.startDate : '',
    endDate: validDate(source.endDate) ? source.endDate : '',
    startTime: validTime(source.startTime) ? source.startTime : '00:00',
    endTime: validTime(source.endTime) ? source.endTime : '23:59',
    weekdays: weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6],
    source: SOURCES.has(source.source) ? source.source : 'local',
    values,
  };
}

export function normalizeSchedule(value = {}) {
  const rules = Array.isArray(value?.rules) ? value.rules.slice(0, MAX_RULES).map(normalizeRule) : [];
  return { schemaVersion: SCHEDULE_SCHEMA_VERSION, timezone: boundedString(value?.timezone, 'local'), rules };
}

export function loadSchedule(storage) {
  const store = storeOf(storage);
  if (!store) return normalizeSchedule();
  try { return normalizeSchedule(JSON.parse(store.getItem(SCHEDULE_STORAGE_KEY) || '{}')); } catch { return normalizeSchedule(); }
}

export function saveSchedule(schedule, storage) {
  const normalized = normalizeSchedule(schedule);
  const store = storeOf(storage);
  try { store?.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* private storage may be unavailable */ }
  return normalized;
}

export function upsertRule(rule, storage) {
  const schedule = loadSchedule(storage);
  const normalized = normalizeRule(rule, schedule.rules.length);
  const index = schedule.rules.findIndex((candidate) => candidate.id === normalized.id);
  if (index >= 0) schedule.rules[index] = normalized; else if (schedule.rules.length < MAX_RULES) schedule.rules.push(normalized);
  return saveSchedule(schedule, storage);
}

export function removeRule(id, storage) {
  const schedule = loadSchedule(storage);
  schedule.rules = schedule.rules.filter((rule) => rule.id !== id);
  return saveSchedule(schedule, storage);
}

function dateKey(date) { return date.toISOString().slice(0, 10); }
function timeKey(date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
export function ruleMatches(rule, date = new Date()) {
  const normalized = normalizeRule(rule);
  if (!normalized.enabled || !normalized.weekdays.includes(date.getDay())) return false;
  const day = dateKey(date);
  if (normalized.startDate && day < normalized.startDate) return false;
  if (normalized.endDate && day > normalized.endDate) return false;
  const now = timeKey(date);
  return normalized.startTime <= normalized.endTime ? now >= normalized.startTime && now <= normalized.endTime : now >= normalized.startTime || now <= normalized.endTime;
}

export function resolveScheduledValues(schedule = loadSchedule(), date = new Date()) {
  return normalizeSchedule(schedule).rules.filter((rule) => ruleMatches(rule, date)).sort((a, b) => b.priority - a.priority || b.id.localeCompare(a.id)).reduce((result, rule) => ({ ...result, ...rule.values }), {});
}

export function subscribeSchedule(listener, target = globalThis) {
  if (!target?.addEventListener) return () => {};
  const handler = (event) => { if (event.key === SCHEDULE_STORAGE_KEY) listener(loadSchedule(target.localStorage), event); };
  target.addEventListener('storage', handler); return () => target.removeEventListener('storage', handler);
}

export default { loadSchedule, saveSchedule, upsertRule, removeRule, ruleMatches, resolveScheduledValues, subscribeSchedule };
