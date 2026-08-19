/**
 * Agent Memory surface entry point.
 * Ported from design/Agent Memory.dc.html — memory console (instructions,
 * skills, sync, history) plus the Status Hub session tab.
 */
import { initVueApp } from '~/lib/utils/vue3compat/init_vue_app';
import AgentMemory from './AgentMemory.vue';

export { AgentMemory };
export * from './data';

export const AGENT_MEMORY_MOUNT_SELECTOR = '#js-material-agent-memory';

/**
 * Mounts the Agent Memory surface. A host shell may pass a `sidebar` slot
 * via `component.$slots` render composition; standalone mounts render
 * without one and the layout collapses to just the main column.
 */
export function initAgentMemoryApp(el = AGENT_MEMORY_MOUNT_SELECTOR) {
  const target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!target) return null;

  return initVueApp({
    el: target,
    name: 'AgentMemoryRoot',
    component: AgentMemory,
  });
}

export default AgentMemory;
