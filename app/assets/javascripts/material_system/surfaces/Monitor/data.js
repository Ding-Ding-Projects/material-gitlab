/**
 * View-model data for the Monitor surface, ported from the design's
 * `Monitor.dc.html` DCLogic state and `renderVals()`. Field names track what a
 * real fetch would return per tab (Incident/Alert/error-tracking group, on-call
 * rotation, Service Desk ticket). The test-only fixture factory is never used
 * by the production mount.
 */

import { assertCollection, requestJson, requireEndpoint } from '../live-data';

export const TABS = Object.freeze(['Incidents', 'Alerts', 'Errors', 'On-call', 'Service desk']);

// Maps a tab label to the collection key in the state object returned by
// createSeedMonitorData(), mirroring the design's `s.tab === 'X'` branches.
export const TAB_COLLECTION_KEY = Object.freeze({
  Incidents: 'incidents',
  Alerts: 'alerts',
  Errors: 'errors',
  'On-call': 'oncall',
  'Service desk': 'tickets',
});

// Icon shown at the start of each row, one per tab, ported from the design's
// per-tab `icon:` literal.
export const TAB_ROW_ICON = Object.freeze({
  Incidents: 'emergency',
  Alerts: 'notificationImportant',
  Errors: 'error',
  'On-call': 'phoneInTalk',
  'Service desk': 'supportAgent',
});

// Status -> [containerVar, onContainerVar], ported from the design's `meta` map.
// Values are the CSS custom properties defined in monitor.scss so colors stay
// theme-aware without duplicating light/dark hex pairs here.
const STATUS_COLOR_VARS = Object.freeze({
  active: { bg: 'var(--mon-err-c)', fg: 'var(--mon-err)' },
  mitigated: { bg: 'var(--mon-warn-c)', fg: 'var(--mon-warn)' },
  resolved: { bg: 'var(--mon-good-c)', fg: 'var(--mon-good)' },
  firing: { bg: 'var(--mon-err-c)', fg: 'var(--mon-err)' },
  acknowledged: { bg: 'var(--mon-warn-c)', fg: 'var(--mon-warn)' },
  open: { bg: 'var(--mon-warn-c)', fg: 'var(--mon-warn)' },
  closed: { bg: 'var(--mon-surf-ch)', fg: 'var(--mon-onsurf-v)' },
});

export function statusColorVars(status) {
  return STATUS_COLOR_VARS[status] || STATUS_COLOR_VARS.closed;
}

// Bulk actions offered per tab, ported from each tab's single-row `action`
// transition in the design (Incidents: active->mitigated->resolved, Alerts:
// firing->acknowledged, Service desk: open<->closed). Errors and On-call have
// no per-row action in the design, so no status bulk action is invented for them.
export const BULK_ACTIONS_BY_TAB = Object.freeze({
  Incidents: [
    { label: 'Mitigate', next: 'mitigated' },
    { label: 'Resolve', next: 'resolved' },
  ],
  Alerts: [{ label: 'Acknowledge', next: 'acknowledged' }],
  Errors: [],
  'On-call': [],
  'Service desk': [
    { label: 'Close', next: 'closed' },
    { label: 'Reopen', next: 'open' },
  ],
});

const SEED_INCIDENTS = [
  {
    id: 'INC-42',
    name: 'API 5xx spike on /boards endpoints',
    sub: '#INC-42 · opened from alert · assigned dweiss',
    sev: 'S1',
    status: 'active',
    when: '25m ago',
  },
  {
    id: 'INC-41',
    name: 'Review apps stuck in deploying',
    sub: '#INC-41 · runner pool exhaustion',
    sev: 'S2',
    status: 'mitigated',
    when: '4h ago',
  },
  {
    id: 'INC-39',
    name: 'Registry GC ran long, pulls slow',
    sub: '#INC-39 · resolved with GC window change',
    sev: 'S3',
    status: 'resolved',
    when: '2d ago',
  },
];

const SEED_ALERTS = [
  {
    id: 'alert-1',
    name: 'HighErrorRate boards-api',
    sub: 'Prometheus · firing 25m · threshold 2%',
    status: 'firing',
  },
  {
    id: 'alert-2',
    name: 'PodCrashLooping review-mr-1278',
    sub: 'K8s agent · 6 restarts / 10m',
    status: 'firing',
  },
  {
    id: 'alert-3',
    name: 'CertExpiresSoon pages.example.dev',
    sub: 'expires in 13 days',
    status: 'acknowledged',
  },
  {
    id: 'alert-4',
    name: 'DiskPressure staging-shared-node-3',
    sub: 'auto-resolved after scale-up',
    status: 'resolved',
  },
];

const SEED_ERRORS = [
  {
    id: 'err-1',
    name: 'NoMethodError: undefined method `col` for nil',
    sub: 'boards/lists_controller.rb:52 · 214 events · 38 users',
    when: 'first seen 3h ago',
  },
  {
    id: 'err-2',
    name: 'TypeError: range.value is undefined',
    sub: 'virtual_scroll.js:14 · 89 events · 12 users',
    when: 'first seen 2h ago',
  },
  {
    id: 'err-3',
    name: 'ActiveRecord::LockWaitTimeout',
    sub: 'merge_service.rb:88 · 7 events',
    when: 'first seen 1d ago',
  },
];

const SEED_ONCALL = [
  {
    id: 'oncall-1',
    name: 'Primary — Platform',
    sub: 'Rotation weekly · currently dweiss',
    until: 'until Mon 09:00',
  },
  {
    id: 'oncall-2',
    name: 'Secondary — Platform',
    sub: 'Rotation weekly · currently ohaddad',
    until: 'until Mon 09:00',
  },
  {
    id: 'oncall-3',
    name: 'Security escalation',
    sub: 'Business hours · currently pnair',
    until: 'until 18:00',
  },
];

const SEED_TICKETS = [
  {
    id: 'ticket-1',
    name: 'Cannot push over SSH from office network',
    sub: 'service-desk+phoenix@acme.dev · from customer',
    status: 'open',
    when: '1h ago',
  },
  {
    id: 'ticket-2',
    name: 'Request: raise artifact size limit',
    sub: 'internal requester',
    status: 'open',
    when: '1d ago',
  },
  {
    id: 'ticket-3',
    name: 'Broken link in release notes',
    sub: 'resolved by docs MR !1290',
    status: 'closed',
    when: '3d ago',
  },
];

/** Returns fresh, independently-mutable collections so multiple mounted surfaces never share state. */
export function createSeedMonitorData() {
  return {
    incidents: SEED_INCIDENTS.map((row) => ({ ...row })),
    alerts: SEED_ALERTS.map((row) => ({ ...row })),
    errors: SEED_ERRORS.map((row) => ({ ...row })),
    oncall: SEED_ONCALL.map((row) => ({ ...row })),
    tickets: SEED_TICKETS.map((row) => ({ ...row })),
  };
}

/**
 * Builds a plain-text or regex matcher exactly like the design's `matcher()`:
 * empty query matches everything, regex mode compiles the query case-insensitively
 * and falls back to match-all on invalid syntax, plain mode is a case-insensitive
 * substring test.
 */
export function createMatcher(query, regexMode) {
  if (!query) return () => true;
  if (regexMode) {
    try {
      const re = new RegExp(query, 'i');
      return (text) => re.test(text);
    } catch (_error) {
      return () => true;
    }
  }
  const lowered = query.toLowerCase();
  return (text) => text.toLowerCase().includes(lowered);
}

/**
 * The searchable text for one row, ported from the design's per-tab filter
 * call site. Every tab matches on name + sub except Service desk, which the
 * design deliberately matches on name alone (`s.tickets.filter(x => m(x.name))`).
 */
export function searchTextFor(tab, item) {
  if (tab === 'Service desk') return item.name;
  return `${item.name} ${item.sub}`;
}

/** The action a single row of this tab currently offers, ported from the design's per-tab `action`/`act`. */
export function rowActionFor(tab, item) {
  if (tab === 'Incidents') {
    if (item.status === 'active') return { label: 'Mitigate', next: 'mitigated' };
    if (item.status === 'mitigated') return { label: 'Resolve', next: 'resolved' };
    return null;
  }
  if (tab === 'Alerts') {
    return item.status === 'firing' ? { label: 'Acknowledge', next: 'acknowledged' } : null;
  }
  if (tab === 'Service desk') {
    return item.status === 'open' ? { label: 'Close', next: 'closed' } : { label: 'Reopen', next: 'open' };
  }
  return null;
}

/** Builds the row view-model for one item of the active tab, ported from the design's per-tab row-mapping. */
export function buildRow(tab, item) {
  const icon = TAB_ROW_ICON[tab];
  const action = rowActionFor(tab, item);
  const base = {
    id: item.id,
    icon,
    title: item.name,
    titleFont: tab === 'Alerts' || tab === 'Errors' ? 'monospace' : 'inherit',
    actionLabel: action ? action.label : null,
    actionNext: action ? action.next : null,
  };
  if (tab === 'Incidents') {
    const colors = statusColorVars(item.status);
    return {
      ...base,
      iconColor: colors.fg,
      sub: `${item.sub} · ${item.sev}`,
      badge: item.status,
      badgeBg: colors.bg,
      badgeFg: colors.fg,
      meta: item.when,
    };
  }
  if (tab === 'Alerts') {
    const colors = statusColorVars(item.status);
    return {
      ...base,
      iconColor: colors.fg,
      sub: item.sub,
      badge: item.status,
      badgeBg: colors.bg,
      badgeFg: colors.fg,
      meta: '',
    };
  }
  if (tab === 'Errors') {
    return {
      ...base,
      iconColor: 'var(--mon-err)',
      sub: item.sub,
      badge: null,
      badgeBg: null,
      badgeFg: null,
      meta: item.when,
    };
  }
  if (tab === 'On-call') {
    return {
      ...base,
      iconColor: 'var(--mon-prim)',
      sub: item.sub,
      badge: null,
      badgeBg: null,
      badgeFg: null,
      meta: item.until,
    };
  }
  // Service desk
  const colors = statusColorVars(item.status);
  return {
    ...base,
    iconColor: 'var(--mon-prim)',
    sub: item.sub,
    badge: item.status,
    badgeBg: colors.bg,
    badgeFg: colors.fg,
    meta: item.when,
  };
}

/** Regex builder corpus: names from incidents, alerts, errors and tickets, ported from the design's `regexCorpus`. */
export function buildRegexCorpus(data) {
  return [
    ...data.incidents.map((row) => row.name),
    ...data.alerts.map((row) => row.name),
    ...data.errors.map((row) => row.name),
    ...data.tickets.map((row) => row.name),
  ];
}

export async function fetchMonitorData({ endpoints, fetchImpl } = {}) {
  const result = {};
  for (const tab of TABS) {
    const key = TAB_COLLECTION_KEY[tab];
    const payload = await requestJson(requireEndpoint(endpoints, key), { fetchImpl });
    result[key] = assertCollection(payload, key);
  }
  return result;
}
