<script>
import MdIcon from './MdIcon.vue';
import TodoListItem from './TodoListItem.vue';
import { TODO_VIEWS } from '../data';

export default {
  name: 'TodoList',
  components: { MdIcon, TodoListItem },
  props: {
    todos: {
      type: Array,
      required: true,
    },
    view: {
      type: String,
      default: TODO_VIEWS.PENDING,
    },
    selectedIds: {
      type: Array,
      default: () => [],
    },
    hasAnyInView: {
      type: Boolean,
      default: true,
    },
    searchActive: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isEmptyFromSearch() {
      return this.hasAnyInView && this.todos.length === 0 && this.searchActive;
    },
  },
  methods: {
    isSelected(id) {
      return this.selectedIds.includes(id);
    },
  },
};
</script>

<template>
  <div id="todos-panel" class="md-todos__card" role="tabpanel" :aria-label="view === 'pending' ? 'To do' : 'Done'">
    <ul v-if="todos.length > 0" class="md-todos__list" role="list">
      <todo-list-item
        v-for="todo in todos"
        :key="todo.id"
        :todo="todo"
        :selected="isSelected(todo.id)"
        @toggle-select="$emit('toggle-select', $event)"
        @mark-done="$emit('mark-done', $event)"
        @restore="$emit('restore', $event)"
      />
    </ul>

    <div v-else-if="isEmptyFromSearch" class="md-todos__empty">
      <md-icon name="search" :size="36" class="md-todos__empty-icon" />
      <p>No to-dos match your search.</p>
      <button type="button" class="md-todos__link-button" @click="$emit('clear-search')">Clear search</button>
    </div>

    <div v-else-if="view === 'pending'" class="md-todos__empty">
      <md-icon name="task_alt" :size="40" class="md-todos__empty-icon md-todos__empty-icon--success" />
      <p>Good job! Your to-do list is empty.</p>
    </div>

    <div v-else class="md-todos__empty">
      <md-icon name="inbox" :size="40" class="md-todos__empty-icon" />
      <p>Nothing completed yet.</p>
    </div>
  </div>
</template>
