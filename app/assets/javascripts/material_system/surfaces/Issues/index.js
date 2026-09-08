/**
 * Entry point for the Issues surface. Mount `IssuesSurface` wherever the
 * Issues page renders; the other exports are for reuse and testing.
 */
export { default as IssuesSurface } from './Issues.vue';
export { default as IssueSearchBar } from './components/IssueSearchBar.vue';
export { default as FilterBar } from './components/FilterBar.vue';
export { default as BulkActionBar } from './components/BulkActionBar.vue';
export { default as IssueListView } from './components/IssueListView.vue';
export { default as IssueRow } from './components/IssueRow.vue';
export { default as IssueBoardView } from './components/IssueBoardView.vue';
export { default as BoardColumn } from './components/BoardColumn.vue';
export { default as BoardCard } from './components/BoardCard.vue';
export { default as IssueDrawer } from './components/IssueDrawer.vue';
export { default as NewIssueDialog } from './components/NewIssueDialog.vue';
export { default as RegexBuilderDialog } from './components/RegexBuilderDialog.vue';
export { default as ConfirmDialog } from './components/ConfirmDialog.vue';
export { default as NotificationStack } from './components/NotificationStack.vue';
export { default as LabelChip } from './components/LabelChip.vue';
export { default as MdsIcon } from './components/MdsIcon.vue';
export { default as SurfaceHeader } from './components/SurfaceHeader.vue';
export { default as ViewSwitcher } from './components/ViewSwitcher.vue';

export * from './data';
export * from './regexIssueSearch';

import Vue from 'vue';
import Issues from './Issues.vue';
import { createGitLabIssuesAdapter } from './data';

/** Mounts only when the server supplies a real project identity. */
export function initIssues(el, options = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  const projectId = mountEl.dataset.projectId;
  if (!projectId) throw new Error('Issues surface requires data-project-id from the project route.');
  const permissions = {
    create: mountEl.dataset.canCreate === 'true',
    update: mountEl.dataset.canUpdate === 'true',
    delete: mountEl.dataset.canDelete === 'true',
  };
  const user = JSON.parse(mountEl.dataset.currentUser || 'null');
  const adapter = options.adapter || createGitLabIssuesAdapter({ projectId, permissions });
  return new Vue({
    name: 'ProjectIssuesRoot',
    render: (h) => h(Issues, { props: { projectId, apiAdapter: adapter, production: true, permissions, user,
      newIssuePath: mountEl.dataset.newIssuePath || '', boardPath: mountEl.dataset.boardPath || '', workItemsPath: mountEl.dataset.workItemsPath || '' } }),
  }).$mount(mountEl);
}

export { default } from './Issues.vue';
