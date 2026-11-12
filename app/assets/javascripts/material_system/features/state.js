import Vue from 'vue';
import { loadSettings, updateSettings, subscribeSettings } from '../settings';
import { createAdhdModes, createAccessibilityTools } from './flags';
import { applyToDocument } from './document';
import { createSchoolModeAdapter } from '../school-mode';
import { createPersonalVocabularyLoader } from '../vocabulary';
import { createExtensionHost } from './extensions';
import { setWordingOverride } from './i18n';
import { createLockStore } from './locks';
import { createScheduleStore } from './schedules';
import { LOGO_IMAGE_STORAGE_KEY } from './logo-file';

export const SETUP_STORAGE_KEY = 'material-system.setup-wizard.v1';
export const SCHOOL_PIN_STORAGE_KEY = 'material-system.school-mode-pin.v1';
export const DISPLAY_NAME_STORAGE_KEY = 'material-system.display-name.v1';
export const SHIPPED_NAME = 'Material GitLab';

// School mode's PIN is kept as a salted SHA-256 digest. It is a comfort lock for this device,
// not a security boundary: deleting the site data clears it.
async function digest(pin, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// One reactive store shared by the top bar controls, the features rail, the feature hub
// and the setup wizard, so every view of a value reads and writes the same thing.
export function createFeatureState({
  storage = globalThis.localStorage,
  root,
  target = globalThis,
} = {}) {
  const adhdStore = createAdhdModes({ storage, target });
  const a11yStore = createAccessibilityTools({ storage, target });
  const readSetup = () => {
    try {
      const saved = JSON.parse(storage?.getItem?.(SETUP_STORAGE_KEY) || 'null');
      if (saved && typeof saved.step === 'number') return saved;
    } catch (_error) {
      /* treat as not started */
    }
    return { step: 0, completed: false, skipped: [] };
  };

  const readJson = (key) => {
    try {
      return JSON.parse(storage?.getItem?.(key) || 'null');
    } catch (_error) {
      return null;
    }
  };
  const writeJson = (key, value) => {
    try {
      if (value === null) storage?.removeItem?.(key);
      else storage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  };
  const school = createSchoolModeAdapter({
    storage,
    target,
    unlockAdapter: {
      async verify(pin) {
        const saved = readJson(SCHOOL_PIN_STORAGE_KEY);
        return Boolean(saved && (await digest(String(pin), saved.salt)) === saved.hash);
      },
    },
  });
  const wording = createPersonalVocabularyLoader({ storage });
  const extensions = createExtensionHost({ storage, target });
  const lockStore = createLockStore({ storage });
  const scheduleStore = createScheduleStore({ storage });

  const state = Vue.observable({
    settings: loadSettings(storage),
    adhd: adhdStore.get(),
    a11y: a11yStore.get(),
    setup: readSetup(),
    hubOpen: false,
    hubTab: 'setup',
    error: '',
    pageLoadedAt: Date.now(),
    school: school.snapshot(),
    wording: wording.snapshot(),
    displayName: readJson(DISPLAY_NAME_STORAGE_KEY) || SHIPPED_NAME,
    extensions: extensions.list(),
    lang: 'en',
    effective: null,
    matchedRules: [],
    rules: scheduleStore.rules(),
    locks: lockStore.list(),
    tabTargets: [],
    unlockRequest: null,
    logo: readJson(LOGO_IMAGE_STORAGE_KEY),
  });

  const apply = () => {
    const resolved = scheduleStore.resolve(state.settings);
    state.effective = resolved.value;
    state.matchedRules = resolved.matchedRuleIds;
    state.lang = state.school.enabled ? 'en' : state.effective.language;
    setWordingOverride(
      state.school.enabled || state.wording.status !== 'loaded'
        ? null
        : (key, language, fallback) => wording.translate(key, language, fallback),
    );
    if (root?.ownerDocument && state.displayName !== SHIPPED_NAME) {
      const doc = root.ownerDocument;
      doc.title = doc.title.replace(/(GitLab|Material GitLab)\s*$/, state.displayName);
    }
    if (root?.ownerDocument) {
      const doc = root.ownerDocument;
      let icon = doc.querySelector('link[data-material-logo]');
      if (state.logo && !icon) {
        icon = doc.createElement('link');
        icon.rel = 'icon';
        icon.setAttribute('data-material-logo', '');
        doc.head?.appendChild(icon);
      }
      if (icon && state.logo) icon.href = state.logo;
      if (icon && !state.logo) icon.remove();
    }
    return applyToDocument(
      { ...state, settings: { ...state.effective, language: state.lang } },
      root,
    );
  };
  // Scheduled settings change on the minute.
  const scheduleTimer = setInterval(apply, 60 * 1000);
  const unsubscribers = [
    subscribeSettings((next) => {
      state.settings = next;
      apply();
    }, target),
    adhdStore.subscribe((next) => {
      state.adhd = next;
      apply();
    }),
    a11yStore.subscribe((next) => {
      state.a11y = next;
      apply();
    }),
    school.subscribe((next) => {
      state.school = next;
      apply();
    }),
    wording.subscribe((next) => {
      state.wording = next;
      apply();
    }),
  ];
  apply();

  return {
    state,
    setSetting(patch) {
      const result = updateSettings(patch, storage);
      if (result.ok) {
        state.settings = result.value;
        state.error = '';
      } else {
        state.error = 'saveFailed';
      }
      apply();
      return result.ok;
    },
    setAdhd(name, value) {
      const ok = adhdStore.set(name, value);
      state.error = ok ? '' : 'saveFailed';
      return ok;
    },
    setA11y(name, value) {
      const ok = a11yStore.set(name, value);
      state.error = ok ? '' : 'saveFailed';
      return ok;
    },
    isA11yDefault: (name) => a11yStore.isDefault(name),
    isAdhdDefault: (name) => adhdStore.isDefault(name),
    saveSetup(patch) {
      state.setup = { ...state.setup, ...patch };
      try {
        storage?.setItem?.(SETUP_STORAGE_KEY, JSON.stringify(state.setup));
        return true;
      } catch (_error) {
        state.error = 'saveFailed';
        return false;
      }
    },
    openHub(tab = state.hubTab) {
      state.hubTab = tab;
      state.hubOpen = true;
    },
    closeHub() {
      state.hubOpen = false;
    },
    exportJson() {
      return JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          settings: state.settings,
          adhdModes: state.adhd,
          accessibilityTools: state.a11y,
        },
        null,
        2,
      );
    },
    async enableSchool(pin) {
      if (!/^\d{4,12}$/.test(String(pin))) return { ok: false, reason: 'pinInvalid' };
      const salt = Math.random().toString(36).slice(2);
      if (!writeJson(SCHOOL_PIN_STORAGE_KEY, { salt, hash: await digest(String(pin), salt) }))
        return { ok: false, reason: 'saveFailed' };
      const result = school.enable();
      return result.ok ? { ok: true } : { ok: false, reason: 'saveFailed' };
    },
    async disableSchool(pin) {
      const result = await school.disable(String(pin));
      if (result.ok) writeJson(SCHOOL_PIN_STORAGE_KEY, null);
      return result.ok
        ? { ok: true }
        : { ok: false, reason: result.status === 'rejected' ? 'pinRejected' : 'saveFailed' };
    },
    loadWording(source) {
      return wording.load(source);
    },
    clearWording() {
      return wording.clear();
    },
    rename(name) {
      const value = String(name || '')
        .trim()
        .slice(0, 80);
      state.displayName = value || SHIPPED_NAME;
      writeJson(DISPLAY_NAME_STORAGE_KEY, value && value !== SHIPPED_NAME ? value : null);
      apply();
    },
    startExtensions(context) {
      return extensions.start(context);
    },
    setExtension(id, value) {
      const ok = extensions.setEnabled(id, value);
      state.extensions = extensions.list();
      return ok;
    },
    // Element locks, unlock ladder and Support Tickets.
    isLocked: (target) => state.locks.some((lock) => lock.target === target),
    async lockTarget(targetId, options) {
      const result = await lockStore.lock(targetId, options);
      state.locks = lockStore.list();
      return result;
    },
    async unlockTarget(targetId, values) {
      const result = await lockStore.unlock(targetId, values);
      state.locks = lockStore.list();
      return result;
    },
    waitRemaining: (targetId) => lockStore.waitRemaining(targetId),
    skipWait(targetId) {
      const ok = lockStore.skipWait(targetId);
      state.locks = lockStore.list();
      return ok;
    },
    climbsLeft: () => lockStore.climbsLeft(),
    tickets: () => lockStore.tickets(),
    fileTicket: (subject) => lockStore.fileTicket(subject),
    resolveTicket: (id) => lockStore.resolveTicket(id),
    requestUnlock(targetId, href = null) {
      state.hubOpen = false;
      state.unlockRequest = { target: targetId, href };
    },
    clearUnlockRequest() {
      state.unlockRequest = null;
    },
    setTabTargets(items) {
      state.tabTargets = items.map(({ id, label }) => ({ id, label }));
    },
    // Scheduled settings.
    addRule(rule) {
      const result = scheduleStore.add(rule);
      state.rules = scheduleStore.rules();
      apply();
      return result;
    },
    toggleRule(id, enabled) {
      const result = scheduleStore.toggle(id, enabled);
      state.rules = scheduleStore.rules();
      apply();
      return result;
    },
    removeRule(id) {
      const result = scheduleStore.remove(id);
      state.rules = scheduleStore.rules();
      apply();
      return result;
    },
    // Custom logo (already converted to a small PNG data URL).
    setLogo(dataUrl) {
      if (!writeJson(LOGO_IMAGE_STORAGE_KEY, dataUrl)) {
        state.error = 'saveFailed';
        return false;
      }
      state.logo = dataUrl;
      apply();
      return true;
    },
    clearLogo() {
      writeJson(LOGO_IMAGE_STORAGE_KEY, null);
      state.logo = null;
      apply();
    },
    dispose() {
      clearInterval(scheduleTimer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      adhdStore.dispose();
      a11yStore.dispose();
    },
  };
}
