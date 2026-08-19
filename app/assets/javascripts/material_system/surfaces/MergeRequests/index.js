/**
 * Entry point for the Merge requests material-system surface.
 * Ported from design/Merge Requests.dc.html.
 */
import Vue from 'vue';
import MergeRequests from './MergeRequests.vue';

import './mergerequests.scss';

export { default as MergeRequests } from './MergeRequests.vue';
export { default as MrTopBar } from './components/MrTopBar.vue';
export { default as MrList } from './components/MrList.vue';
export { default as MrListItem } from './components/MrListItem.vue';
export { default as MrDetail } from './components/MrDetail.vue';
export { default as MrChangesTab } from './components/MrChangesTab.vue';
export { default as MrDiscussionTab } from './components/MrDiscussionTab.vue';
export { default as MrCommandPalette } from './components/MrCommandPalette.vue';
export { default as MrRegexPopover } from './components/MrRegexPopover.vue';
export { default as MrConfirmDialog } from './components/MrConfirmDialog.vue';
export { default as MrToastHost } from './components/MrToastHost.vue';

export * from './data';

/**
 * Mounts the Merge requests surface onto `el`, replacing its contents.
 * Returns the created Vue instance so a caller can destroy() it on teardown.
 */
export function initMergeRequests(el) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;

  return new Vue({
    el: mountEl,
    render: (createElement) => createElement(MergeRequests),
  });
}

export default MergeRequests;
