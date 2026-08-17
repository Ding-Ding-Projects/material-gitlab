/**
 * Code surface entry point — Branches, commits, tags, compare, and snippets.
 * Ported from design/Code.dc.html.
 */

import { createSurfaceInventory } from '../../registry';
import CodeSurface from './Code.vue';

export { default as CodeSurface } from './Code.vue';
export { default } from './Code.vue';

export {
  CODE_TABS,
  DEFAULT_COMPARE_REFS,
  PIPELINE_STATUS_META,
  createMatcher,
  filterBranches,
  filterCommits,
  filterTags,
  filterSnippets,
  buildRegexCorpus,
  describeCompareResult,
  fetchBranches,
  fetchCommits,
  fetchTags,
  fetchSnippets,
  runCompareRequest,
  createCodeSeedState,
} from './data';

export const CODE_SURFACE_ID = 'surface.code';

/** Registers this surface's stable id in the shared universal-contract registry. */
export function createCodeSurfaceInventory() {
  return createSurfaceInventory({
    id: CODE_SURFACE_ID,
    kind: 'primary',
    title: 'Code',
    route: '/code',
  });
}

/** Convenience factory for mounting the surface with Vue.extend consumers. */
export function createCodeSurfaceComponent() {
  return CodeSurface;
}
