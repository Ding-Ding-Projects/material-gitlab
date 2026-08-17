/**
 * Settings surface entry point. Ported from design/Settings.dc.html.
 */

import Settings from './Settings.vue';

export default Settings;
export { default as Settings } from './Settings.vue';

export { default as TopBar } from './components/TopBar.vue';
export { default as TabStrip } from './components/TabStrip.vue';
export { default as SearchField } from './components/SearchField.vue';
export { default as RegexBuilderPopover } from './components/RegexBuilderPopover.vue';
export { default as SelectionToolbar } from './components/SelectionToolbar.vue';
export { default as ConfirmDialog } from './components/ConfirmDialog.vue';
export { default as NotificationHost } from './components/NotificationHost.vue';
export { default as CommandPalette } from './components/CommandPalette.vue';
export { default as StIcon } from './components/StIcon.vue';

export { default as GeneralTab } from './components/GeneralTab.vue';
export { default as ProjectDetailsCard } from './components/ProjectDetailsCard.vue';
export { default as ProjectLogoCard } from './components/ProjectLogoCard.vue';
export { default as VocabularyCard } from './components/VocabularyCard.vue';
export { default as FileConverterCard } from './components/FileConverterCard.vue';

export { default as MembersTab } from './components/MembersTab.vue';
export { default as MemberRow } from './components/MemberRow.vue';

export { default as CicdTab } from './components/CicdTab.vue';
export { default as VariableRow } from './components/VariableRow.vue';
export { default as ProtectedBranchRow } from './components/ProtectedBranchRow.vue';

export { default as IntegrationsTab } from './components/IntegrationsTab.vue';
export { default as IntegrationRow } from './components/IntegrationRow.vue';

export * from './data';
