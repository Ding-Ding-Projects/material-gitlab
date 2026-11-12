import { verifyTotp } from './totp';

// Element locks: a for-fun, self-imposed speed bump on a tab or a feature hub panel, opened with
// a PIN, a password, an authenticator code, or a mix. This is not security. Locks live in this
// browser's site storage, and the honest recovery path for a forgotten lock is deleting this
// site's data, which clears every lock at once.

export const LOCKS_STORAGE_KEY = 'material-system.element-locks.v1';
export const LADDER_STORAGE_KEY = 'material-system.unlock-ladder.v1';
export const TICKETS_STORAGE_KEY = 'material-system.support-tickets.v1';

export const LOCK_MIXES = Object.freeze([
  ['pin'],
  ['password'],
  ['pin', 'password'],
  ['password', 'totp'],
  ['pin', 'totp'],
  ['password', 'pin', 'totp'],
]);

export const FREE_TRIES = 2;
export const LADDER_CLIMBS_PER_HOUR = 3;

async function digest(value, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const salt = () => Math.random().toString(36).slice(2, 12);

export const waitSecondsAfter = (failures) =>
  failures < FREE_TRIES ? 0 : Math.min(3600, 30 * 2 ** (failures - FREE_TRIES));

export function validateLockInput(methods, { pin, password }) {
  const errors = [];
  if (methods.includes('pin') && !/^\d{4,12}$/.test(pin || '')) errors.push('pin');
  if (methods.includes('password') && String(password || '').length < 6) errors.push('password');
  return errors;
}

export function createLockStore({
  storage = globalThis.localStorage,
  now = () => Date.now(),
} = {}) {
  const read = (key, fallback) => {
    try {
      return JSON.parse(storage?.getItem?.(key) || 'null') ?? fallback;
    } catch (_error) {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      storage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  };
  let locks = read(LOCKS_STORAGE_KEY, {});
  const save = () => write(LOCKS_STORAGE_KEY, locks);

  return {
    list: () =>
      Object.entries(locks).map(([target, lock]) => ({
        target,
        label: lock.label,
        methods: lock.methods,
        failures: lock.failures,
        waitUntil: lock.waitUntil,
      })),
    isLocked: (target) => Boolean(locks[target]),
    async lock(target, { label, methods, pin, password, totpSecret }) {
      if (
        !LOCK_MIXES.some(
          (mix) => mix.length === methods.length && mix.every((m) => methods.includes(m)),
        )
      )
        return { ok: false, errors: ['mix'] };
      const errors = validateLockInput(methods, { pin, password });
      if (methods.includes('totp') && !totpSecret) errors.push('totp');
      if (errors.length) return { ok: false, errors };
      const entry = { label, methods, failures: 0, waitUntil: 0 };
      if (methods.includes('pin')) {
        entry.pinSalt = salt();
        entry.pinHash = await digest(pin, entry.pinSalt);
      }
      if (methods.includes('password')) {
        entry.passwordSalt = salt();
        entry.passwordHash = await digest(password, entry.passwordSalt);
      }
      if (methods.includes('totp')) entry.totpSecret = totpSecret;
      locks = { ...locks, [target]: entry };
      return save() ? { ok: true } : { ok: false, errors: ['storage'] };
    },
    waitRemaining(target) {
      const lock = locks[target];
      return lock ? Math.max(0, Math.ceil((lock.waitUntil - now()) / 1000)) : 0;
    },
    async unlock(target, { pin, password, code } = {}) {
      const lock = locks[target];
      if (!lock) return { ok: true };
      if (this.waitRemaining(target) > 0)
        return { ok: false, status: 'waiting', wait: this.waitRemaining(target) };
      let good = true;
      if (lock.methods.includes('pin'))
        good = good && (await digest(String(pin || ''), lock.pinSalt)) === lock.pinHash;
      if (lock.methods.includes('password'))
        good =
          good && (await digest(String(password || ''), lock.passwordSalt)) === lock.passwordHash;
      if (lock.methods.includes('totp'))
        good = good && (await verifyTotp(lock.totpSecret, code || ''));
      if (good) {
        const { [target]: _removed, ...rest } = locks;
        locks = rest;
        save();
        return { ok: true };
      }
      const failures = lock.failures + 1;
      const wait = waitSecondsAfter(failures);
      locks = {
        ...locks,
        [target]: { ...lock, failures, waitUntil: wait ? now() + wait * 1000 : 0 },
      };
      save();
      return { ok: false, status: 'rejected', triesLeft: Math.max(0, FREE_TRIES - failures), wait };
    },
    // Clearing the unlock ladder skips the current wait only. It never unlocks, never refunds
    // tries, and never lowers the next wait.
    skipWait(target) {
      const lock = locks[target];
      if (!lock) return false;
      const climbs = read(LADDER_STORAGE_KEY, []).filter((time) => now() - time < 3600 * 1000);
      if (climbs.length >= LADDER_CLIMBS_PER_HOUR) return false;
      write(LADDER_STORAGE_KEY, [...climbs, now()]);
      locks = { ...locks, [target]: { ...lock, waitUntil: 0 } };
      return save();
    },
    climbsLeft() {
      const climbs = read(LADDER_STORAGE_KEY, []).filter((time) => now() - time < 3600 * 1000);
      return Math.max(0, LADDER_CLIMBS_PER_HOUR - climbs.length);
    },
    tickets: () => read(TICKETS_STORAGE_KEY, []),
    fileTicket(subject) {
      const text = String(subject || '')
        .trim()
        .slice(0, 200);
      if (!text) return null;
      const tickets = read(TICKETS_STORAGE_KEY, []);
      const ticket = {
        id: tickets.length + 1,
        subject: text,
        openedAt: new Date(now()).toISOString(),
        status: 'open',
      };
      write(TICKETS_STORAGE_KEY, [ticket, ...tickets].slice(0, 50));
      return ticket;
    },
    resolveTicket(id) {
      const tickets = read(TICKETS_STORAGE_KEY, []).map((t) =>
        t.id === id ? { ...t, status: 'resolved' } : t,
      );
      write(TICKETS_STORAGE_KEY, tickets);
    },
  };
}

// The four ladder rungs. Each challenge carries its own checker. They are generated in the
// page, so a determined script could read them; the ladder only ever skips a wait.
export function makeChallenge(rung, { random = Math.random, dishes = [] } = {}) {
  const pick = (n) => Math.floor(random() * n);
  if (rung === 'dimsum' && dishes.length >= 4) {
    const choices = [];
    while (choices.length < 4) {
      const dish = dishes[pick(dishes.length)];
      if (!choices.includes(dish)) choices.push(dish);
    }
    const answer = choices[pick(4)];
    return { rung, answer, choices, check: (value) => value === answer };
  }
  if (rung === 'sums') {
    const questions = Array.from({ length: 10 }, () => [1 + pick(20), 1 + pick(20)]);
    return {
      rung,
      questions,
      check: (answers) => questions.every(([a, b], i) => Number(answers[i]) === a + b),
    };
  }
  if (rung === 'moles') return { rung, target: 15, seconds: 30, check: (hits) => hits >= 15 };
  const hours = 1 + pick(12);
  const minutes = pick(12) * 5;
  const label = `${hours}:${String(minutes).padStart(2, '0')}`;
  const choices = new Set([label]);
  while (choices.size < 4) choices.add(`${1 + pick(12)}:${String(pick(12) * 5).padStart(2, '0')}`);
  return {
    rung: 'clock',
    hours,
    minutes,
    choices: [...choices].sort(),
    check: (value) => value === label,
  };
}

export const LADDER_RUNGS = Object.freeze(['dimsum', 'sums', 'moles', 'clock']);
