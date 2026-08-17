/**
 * View model for the Epics surface (epic tree + roadmap).
 *
 * Field names deliberately mirror the group epics GraphQL API
 * (ee/app/assets/javascripts/roadmap/queries/epic.fragment.graphql) so `loadEpics()`
 * below is a drop-in point for a real `client.query()` call: swap the resolved mock
 * array for the `group.epics.nodes` payload and the rest of the surface is unaffected.
 */

export const EPIC_STATE = Object.freeze({ OPEN: 'opened', CLOSED: 'closed' });

// The roadmap view renders a fixed six-month window, matching the design contract.
export const ROADMAP_MONTHS = Object.freeze(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);
export const ROADMAP_YEAR = 2026;

const epic = (fields) => ({
  id: `gid://gitlab/Epic/${fields.iid}`,
  reference: `&${fields.iid}`,
  state: EPIC_STATE.OPEN,
  confidential: false,
  group: { fullPath: 'acme-corp', fullName: 'Acme Corp' },
  children: [],
  ...fields,
});

export const MOCK_EPICS = Object.freeze([
  epic({
    iid: 12,
    title: 'Material 3 UI rewrite',
    state: EPIC_STATE.OPEN,
    startDate: '2026-03-01',
    dueDate: '2026-07-31',
    descendantCounts: { closedIssues: 21, openedIssues: 13 },
    children: [
      epic({
        iid: 14,
        title: 'Token layer and theming',
        state: EPIC_STATE.CLOSED,
        startDate: '2026-03-01',
        dueDate: '2026-04-30',
        descendantCounts: { closedIssues: 8, openedIssues: 0 },
      }),
      epic({
        iid: 15,
        title: 'Issues & boards surfaces',
        state: EPIC_STATE.OPEN,
        startDate: '2026-04-01',
        dueDate: '2026-05-31',
        descendantCounts: { closedIssues: 7, openedIssues: 3 },
      }),
      epic({
        iid: 16,
        title: 'MR & pipeline surfaces',
        state: EPIC_STATE.OPEN,
        startDate: '2026-05-01',
        dueDate: '2026-07-31',
        descendantCounts: { closedIssues: 6, openedIssues: 10 },
      }),
    ],
  }),
  epic({
    iid: 18,
    title: 'Regex search everywhere',
    state: EPIC_STATE.OPEN,
    startDate: '2026-04-01',
    dueDate: '2026-06-30',
    descendantCounts: { closedIssues: 5, openedIssues: 6 },
    children: [
      epic({
        iid: 19,
        title: 'Shared builder component',
        state: EPIC_STATE.CLOSED,
        startDate: '2026-04-01',
        dueDate: '2026-04-30',
        descendantCounts: { closedIssues: 4, openedIssues: 0 },
      }),
      epic({
        iid: 20,
        title: 'Per-surface adoption',
        state: EPIC_STATE.OPEN,
        startDate: '2026-05-01',
        dueDate: '2026-06-30',
        descendantCounts: { closedIssues: 1, openedIssues: 6 },
      }),
    ],
  }),
  epic({
    iid: 22,
    title: 'Agent memory integration',
    state: EPIC_STATE.OPEN,
    startDate: '2026-06-01',
    dueDate: '2026-08-31',
    descendantCounts: { closedIssues: 1, openedIssues: 9 },
    children: [],
  }),
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Structured as an async loader so a real implementation can await a GraphQL
 * client query here without changing any caller in the surface.
 */
export function loadEpics() {
  return Promise.resolve(clone(MOCK_EPICS));
}

export function progressTotal(descendantCounts) {
  return (descendantCounts?.closedIssues ?? 0) + (descendantCounts?.openedIssues ?? 0);
}

export function progressPercent(descendantCounts) {
  const total = progressTotal(descendantCounts);
  if (total <= 0) return 0;
  return Math.round((descendantCounts.closedIssues / total) * 100);
}

/** Flattens the tree into a single list, tagging depth and parent id for callers. */
export function flattenEpics(epics, depth = 0, parentId = null) {
  const out = [];
  epics.forEach((item) => {
    out.push({ ...item, depth, parentId, hasChildren: (item.children || []).length > 0 });
    if (item.children && item.children.length) {
      out.push(...flattenEpics(item.children, depth + 1, item.id));
    }
  });
  return out;
}

/** Text a search query is matched against: reference plus title. */
export function searchableText(item) {
  return `${item.reference} ${item.title}`;
}

/**
 * Clamped 0-based index of a date within the roadmap window, or null when the
 * date falls outside it entirely (defensive against out-of-range API data).
 */
export function monthIndexInWindow(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const monthsFromWindowStart =
    (date.getUTCFullYear() - ROADMAP_YEAR) * 12 + (date.getUTCMonth() - 2); // window starts in March (month 2)
  if (monthsFromWindowStart < 0) return 0;
  if (monthsFromWindowStart > ROADMAP_MONTHS.length - 1) return ROADMAP_MONTHS.length - 1;
  return monthsFromWindowStart;
}

export function formatMonthRange(startDate, dueDate) {
  const startIndex = monthIndexInWindow(startDate);
  const endIndex = monthIndexInWindow(dueDate);
  if (startIndex === null || endIndex === null) return '';
  return `${ROADMAP_MONTHS[startIndex]} → ${ROADMAP_MONTHS[endIndex]} ${ROADMAP_YEAR}`;
}

/** Immutably applies `updater(item)` to every epic (at any depth) whose id is in `ids`. */
export function updateEpicsByIds(epics, ids, updater) {
  const idSet = new Set(ids);
  const walk = (list) =>
    list.map((item) => ({
      ...item,
      ...(idSet.has(item.id) ? updater(item) : null),
      children: walk(item.children || []),
    }));
  return walk(epics);
}

/** Immutably removes every epic (at any depth) whose id is in `ids`. */
export function removeEpicsByIds(epics, ids) {
  const idSet = new Set(ids);
  const walk = (list) =>
    list.filter((item) => !idSet.has(item.id)).map((item) => ({ ...item, children: walk(item.children || []) }));
  return walk(epics);
}

export function roadmapBarGeometry(startDate, dueDate) {
  const startIndex = monthIndexInWindow(startDate) ?? 0;
  const endIndex = monthIndexInWindow(dueDate) ?? startIndex;
  const span = Math.max(1, endIndex - startIndex + 1);
  return {
    leftPercent: (startIndex / ROADMAP_MONTHS.length) * 100,
    widthPercent: (span / ROADMAP_MONTHS.length) * 100,
  };
}
