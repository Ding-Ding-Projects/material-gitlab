/**
 * Entry point for the To-Do list + activity feed surface. Ported from
 * design/Todos.dc.html.
 */
import Vue from 'vue';
import Todos from './Todos.vue';

export { default as Todos } from './Todos.vue';
export { default as TodosSidebar } from './components/TodosSidebar.vue';
export { default as TodosTopBar } from './components/TodosTopBar.vue';
export { default as TodosHeader } from './components/TodosHeader.vue';
export { default as TodosSelectionBar } from './components/TodosSelectionBar.vue';
export { default as TodoList } from './components/TodoList.vue';
export { default as TodoListItem } from './components/TodoListItem.vue';
export { default as RegexBuilderPopover } from './components/RegexBuilderPopover.vue';
export { default as CommandPalette } from './components/CommandPalette.vue';
export { default as MdIcon } from './components/MdIcon.vue';
export * from './data';

/** Mounts the surface onto `el`. Returns the Vue instance, or null if `el` is missing. */
export function initTodosSurface(el) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  if (mountEl.dataset.materialTodos) {
    window.__MATERIAL_TODOS_CONFIG__ = { ...window.__MATERIAL_TODOS_CONFIG__, ...mountEl.dataset };
  }
  return new Vue({
    el: mountEl,
    render: (h) => h(Todos),
  });
}

export default initTodosSurface;
