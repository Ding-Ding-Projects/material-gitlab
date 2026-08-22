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

export { default } from './Issues.vue';
