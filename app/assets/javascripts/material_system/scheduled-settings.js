import { DEFAULT_SETTINGS, validateSettings } from './settings';

export const SCHEDULE_SCHEMA_VERSION = 1;
export const SCHEDULE_LIMITS = Object.freeze({ rules: 128, label: 120 });
export const SCHEDULED_SETTING_KEYS = Object.freeze(
  Object.keys(DEFAULT_SETTINGS).filter((key) => key !== 'schemaVersion'),
);

const WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const SOURCE_TYPES = new Set(['local', 'api', 'homeAssistant']);
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RULE_ID = /^schedule\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

export function validateScheduledSettings(candidate, limits = SCHEDULE_LIMITS) {
  const errors = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return { ok: false, errors: ['schedule must be an object'] };
  if (candidate.schemaVersion !== SCHEDULE_SCHEMA_VERSION)
    errors.push('unsupported schedule schema version');
  if (!Array.isArray(candidate.rules)) errors.push('rules must be an array');
  else if (candidate.rules.length > limits.rules)
    errors.push(`rules exceed limit of ${limits.rules}`);
  const ids = new Set();
  (candidate.rules || []).forEach((rule, index) => {
    const path = `rules[${index}]`;
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!RULE_ID.test(rule.id || '')) errors.push(`${path}.id is invalid`);
    if (ids.has(rule.id)) errors.push(`${path}.id is duplicated`);
    ids.add(rule.id);
    if (typeof rule.label !== 'string' || !rule.label.trim() || rule.label.length > limits.label)
      errors.push(`${path}.label must be 1-${limits.label} characters`);
    if (typeof rule.enabled !== 'boolean') errors.push(`${path}.enabled must be boolean`);
    if (!Number.isInteger(rule.priority)) errors.push(`${path}.priority must be an integer`);
    if (rule.startDate != null && !DATE.test(rule.startDate))
      errors.push(`${path}.startDate is invalid`);
    if (rule.endDate != null && !DATE.test(rule.endDate)) errors.push(`${path}.endDate is invalid`);
    if (!TIME.test(rule.startTime || '') || !TIME.test(rule.endTime || ''))
      errors.push(`${path} requires valid startTime and endTime`);
    if (
      !Array.isArray(rule.weekdays) ||
      !rule.weekdays.length ||
      rule.weekdays.some((day) => !WEEKDAYS.has(day))
    )
      errors.push(`${path}.weekdays must contain weekday numbers`);
    if (!rule.values || typeof rule.values !== 'object' || Array.isArray(rule.values))
      errors.push(`${path}.values must be an object`);
    else {
      Object.keys(rule.values).forEach((key) => {
        if (!SCHEDULED_SETTING_KEYS.includes(key))
          errors.push(`${path}.values.${key} is not schedulable`);
      });
      const settingsResult = validateSettings({ ...DEFAULT_SETTINGS, ...rule.values });
      if (!settingsResult.ok)
        errors.push(...settingsResult.errors.map((error) => `${path}.values: ${error}`));
    }
    if (!rule.source || !SOURCE_TYPES.has(rule.source.type))
      errors.push(`${path}.source.type is invalid`);
    if (
      rule.source?.type === 'api' &&
      (typeof rule.source.url !== 'string' || !/^https:\/\//.test(rule.source.url))
    )
      errors.push(`${path}.source.url must use HTTPS`);
    if (
      rule.source?.type === 'homeAssistant' &&
      (typeof rule.source.entityId !== 'string' ||
        !/^(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/.test(rule.source.entityId))
    )
      errors.push(`${path}.source.entityId is invalid`);
  });
  return errors.length
    ? { ok: false, errors }
    : { ok: true, value: JSON.parse(JSON.stringify(candidate)) };
}

function minutes(value) {
  const [hours, minute] = value.split(':').map(Number);
  return hours * 60 + minute;
}

function ruleMatches(rule, now, sourceStates) {
  if (!rule.enabled) return false;
  const date = now.toISOString().slice(0, 10);
  if (rule.startDate && date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  if (!rule.weekdays.includes(now.getDay())) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(rule.startTime);
  const end = minutes(rule.endTime);
  const inWindow =
    start === end ||
    (start < end ? current >= start && current < end : current >= start || current < end);
  if (!inWindow) return false;
  if (rule.source.type === 'local') return true;
  return sourceStates[rule.id] === true;
}

export function resolveScheduledSettings(
  schedule,
  { baseSettings = DEFAULT_SETTINGS, now = new Date(), sourceStates = {} } = {},
) {
  const checked = validateScheduledSettings(schedule);
  if (!checked.ok)
    return { ok: false, errors: checked.errors, value: { ...baseSettings }, matchedRuleIds: [] };
  const matches = checked.value.rules
    .filter((rule) => ruleMatches(rule, now, sourceStates))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return {
    ok: true,
    value: matches.reduce((settings, rule) => ({ ...settings, ...rule.values }), {
      ...baseSettings,
    }),
    matchedRuleIds: matches.map(({ id }) => id),
  };
}
