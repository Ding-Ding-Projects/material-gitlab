const DEFAULT_TIMEOUT = 5000;

const now = () => new Date().toISOString();

/**
 * Framework-agnostic notification centre. Consumers subscribe to snapshots and
 * render them as a toast stack, while this module owns lifecycle and review state.
 */
export class NotificationCenter {
  constructor({ clock = () => Date.now(), setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
    this.clock = clock;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.items = [];
    this.listeners = new Set();
    this.timers = new Map();
    this.sequence = 0;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot() {
    return this.items.map((item) => ({ ...item, actions: item.actions.map((action) => ({ ...action })) }));
  }

  emit() {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  notify({ title = '', message = '', severity = 'info', timeout = DEFAULT_TIMEOUT, persistent, actions = [], metadata = {} } = {}) {
    const item = {
      id: `notification-${++this.sequence}`,
      title: String(title),
      message: String(message),
      severity,
      createdAt: now(),
      read: false,
      dismissed: false,
      actions: actions.map((action) => ({ ...action })),
      metadata: { ...metadata },
    };
    const staysOpen = persistent ?? severity === 'error' || severity === 'warning' || timeout === 0;
    item.persistent = staysOpen;
    this.items = [item, ...this.items];
    if (!staysOpen && timeout > 0) {
      this.timers.set(item.id, this.setTimeoutFn(() => this.dismiss(item.id), timeout));
    }
    this.emit();
    return item.id;
  }

  dismiss(id) {
    const timer = this.timers.get(id);
    if (timer !== undefined) this.clearTimeoutFn(timer);
    this.timers.delete(id);
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return false;
    item.dismissed = true;
    item.dismissedAt = now();
    this.emit();
    return true;
  }

  markRead(id) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return false;
    item.read = true;
    this.emit();
    return true;
  }

  review({ includeDismissed = true } = {}) {
    return this.snapshot().filter((item) => includeDismissed || !item.dismissed);
  }

  clear({ includePersistent = true } = {}) {
    this.items.forEach((item) => {
      if (includePersistent || !item.persistent) this.dismiss(item.id);
    });
    this.items = includePersistent ? [] : this.items.filter((item) => item.persistent && !item.dismissed);
    return this.emit();
  }

  invokeAction(id, actionId, ...args) {
    const item = this.items.find((entry) => entry.id === id);
    const action = item?.actions.find((entry) => entry.id === actionId);
    if (!action || typeof action.run !== 'function') return false;
    return action.run(...args);
  }

  dispose() {
    this.timers.forEach((timer) => this.clearTimeoutFn(timer));
    this.timers.clear();
    this.listeners.clear();
  }
}

export const notificationCenter = new NotificationCenter();

export default notificationCenter;
