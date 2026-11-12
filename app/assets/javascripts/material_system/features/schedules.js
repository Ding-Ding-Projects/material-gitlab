import {
  SCHEDULE_SCHEMA_VERSION,
  validateScheduledSettings,
  resolveScheduledSettings,
} from '../scheduled-settings';

// Local scheduled settings: rules that switch language, theme, density or seed color during a
// time window on chosen weekdays. Only the "local" source is offered in the browser build.

export const SCHEDULE_STORAGE_KEY = 'material-system.scheduled-settings.v1';

export function createScheduleStore({ storage = globalThis.localStorage } = {}) {
  const empty = () => ({ schemaVersion: SCHEDULE_SCHEMA_VERSION, rules: [] });
  let schedule;
  try {
    schedule = JSON.parse(storage?.getItem?.(SCHEDULE_STORAGE_KEY) || 'null') || empty();
    if (!validateScheduledSettings(schedule).ok) schedule = empty();
  } catch (_error) {
    schedule = empty();
  }
  const save = (next) => {
    const checked = validateScheduledSettings(next);
    if (!checked.ok) return { ok: false, errors: checked.errors };
    try {
      storage?.setItem?.(SCHEDULE_STORAGE_KEY, JSON.stringify(checked.value));
    } catch (_error) {
      return { ok: false, errors: ['storage'] };
    }
    schedule = checked.value;
    return { ok: true };
  };
  return {
    rules: () => schedule.rules.map((rule) => ({ ...rule })),
    add({ label, startTime, endTime, weekdays, values }) {
      const id = `schedule.rule-${Date.now().toString(36)}`;
      return save({
        ...schedule,
        rules: [
          ...schedule.rules,
          {
            id,
            label,
            enabled: true,
            priority: schedule.rules.length,
            startTime,
            endTime,
            weekdays,
            values,
            source: { type: 'local' },
          },
        ],
      });
    },
    toggle(id, enabled) {
      return save({
        ...schedule,
        rules: schedule.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
      });
    },
    remove(id) {
      return save({ ...schedule, rules: schedule.rules.filter((r) => r.id !== id) });
    },
    resolve(baseSettings, now = new Date()) {
      return resolveScheduledSettings(schedule, { baseSettings, now });
    },
  };
}
