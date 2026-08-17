/**
 * View model for the Issues surface, ported from the design's `state.issues`
 * and `renderVals()`. Shaped as an async-looking API module so a real backend
 * can replace `issuesApi` without touching the components that consume it.
 */

export const COLUMN_DEFS = Object.freeze([
  { key: 'todo', name: 'To do', dotVar: '--gl-mds-warn' },
  { key: 'doing', name: 'In progress', dotVar: '--gl-mds-info' },
  { key: 'review', name: 'In review', dotVar: '--gl-mds-onprimc' },
  { key: 'done', name: 'Done', dotVar: '--gl-mds-good' },
]);

export const ASSIGNABLE_PEOPLE = Object.freeze(['Jun Park', 'Dana Weiss', 'Omar Haddad']);

// The signed-in user in the ported mock. A real integration would read this
// from the current session instead of a fixed name.
export const CURRENT_USER = 'Jun Park';

export const LABEL_TAXONOMY = Object.freeze({
  performance: 'warn',
  frontend: 'primary',
  ui: 'info',
  a11y: 'good',
  bug: 'error',
  feature: 'primary',
  search: 'info',
  ci: 'warn',
  backend: 'neutral',
});

export const ALL_LABELS = Object.freeze(Object.keys(LABEL_TAXONOMY));

/**
 * Maps a label name to the CSS custom property pair that renders it, so the
 * chip stays theme-correct in dark mode instead of a fixed hex pair.
 */
export function labelToken(name) {
  const category = LABEL_TAXONOMY[name] || 'neutral';
  return {
    name,
    bg: `var(--gl-mds-label-${category}-bg)`,
    fg: `var(--gl-mds-label-${category}-fg)`,
  };
}

export function avatarInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function seedIssues() {
  return [
    { id: 1, iid: 4312, title: 'Boards render slowly with 500+ cards', body: 'Rendering a board with more than 500 cards causes noticeable frame drops during scroll. Virtualize the column lists.', state: 'Open', col: 'todo', labels: ['performance', 'frontend'], assignee: 'Jun Park', opened: '2d ago' },
    { id: 2, iid: 4308, title: 'Pipeline badge contrast fails in dark mode', body: 'The success badge uses a green that fails WCAG AA against the dark surface. Move to the tonal container pair.', state: 'Open', col: 'doing', labels: ['ui', 'a11y'], assignee: 'Dana Weiss', opened: '3d ago' },
    { id: 3, iid: 4301, title: 'Merge request diff viewer loses scroll position', body: 'Switching between file tabs resets the scroll position of the diff pane.', state: 'Open', col: 'todo', labels: ['frontend', 'bug'], assignee: 'Omar Haddad', opened: '4d ago' },
    { id: 4, iid: 4296, title: 'Add regex mode to global search', body: 'Search bars should accept regular expressions with a builder UI and live match preview.', state: 'Open', col: 'doing', labels: ['search', 'feature'], assignee: 'Jun Park', opened: '5d ago' },
    { id: 5, iid: 4290, title: 'Runner autoscaling flaps under burst load', body: 'Autoscaler scales down too aggressively between pipeline bursts, causing cold starts.', state: 'Open', col: 'review', labels: ['ci', 'backend'], assignee: 'Dana Weiss', opened: '1w ago' },
    { id: 6, iid: 4275, title: 'Wiki sidebar collapses on mobile', body: 'Fixed in 17.2 — the wiki sidebar now uses the standard drawer breakpoints.', state: 'Closed', col: 'done', labels: ['ui'], assignee: 'Omar Haddad', opened: '2w ago' },
    { id: 7, iid: 4260, title: 'Container registry cleanup policy skips tags', body: 'Closed as duplicate of #4188.', state: 'Closed', col: 'done', labels: ['backend', 'bug'], assignee: 'Jun Park', opened: '3w ago' },
  ];
}

let nextIid = 4320;

/**
 * In-memory implementation of the Issues data source. Every method returns a
 * Promise so a real API client can be swapped in without changing callers.
 */
export function createIssuesApi(initial = seedIssues()) {
  let issues = initial.map((issue) => ({ ...issue, labels: [...issue.labels] }));

  const clone = () => issues.map((issue) => ({ ...issue, labels: [...issue.labels] }));

  return {
    async list() {
      return clone();
    },
    async create({ title, body = '', col = 'todo' }) {
      const issue = {
        id: Date.now() + Math.random(),
        iid: nextIid++,
        title: String(title).trim(),
        body: String(body || ''),
        state: col === 'done' ? 'Closed' : 'Open',
        col,
        labels: [],
        assignee: CURRENT_USER,
        opened: 'just now',
      };
      issues = [issue, ...issues];
      return { ...issue, labels: [...issue.labels] };
    },
    async update(id, patch) {
      let updated = null;
      issues = issues.map((issue) => {
        if (issue.id !== id) return issue;
        updated = { ...issue, ...(typeof patch === 'function' ? patch(issue) : patch) };
        return updated;
      });
      return updated ? { ...updated, labels: [...updated.labels] } : null;
    },
    async remove(ids) {
      const removeSet = new Set(Array.isArray(ids) ? ids : [ids]);
      issues = issues.filter((issue) => !removeSet.has(issue.id));
      return true;
    },
  };
}
