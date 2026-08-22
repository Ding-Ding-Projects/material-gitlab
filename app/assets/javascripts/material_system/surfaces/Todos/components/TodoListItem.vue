<script>
import MdIcon from './MdIcon.vue';
import { resolveTodoTone } from '../data';

export default {
  name: 'TodoListItem',
  components: { MdIcon },
  props: {
    todo: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    tone() {
      return resolveTodoTone(this.todo.icon);
    },
    isPending() {
      return this.todo.state === 'pending';
    },
  },
};
</script>

<template>
  <li class="md-todos__item">
    <input
      type="checkbox"
      class="md-todos__item-checkbox"
      :checked="selected"
      :aria-label="`Select to-do from ${todo.actor}`"
      @change="$emit('toggle-select', todo.id)"
    />

    <md-icon :name="todo.icon" :size="22" class="md-todos__item-icon" :class="'md-todos__item-icon--' + tone" />

    <div class="md-todos__item-body">
      <div class="md-todos__item-line">
        <strong>{{ todo.actor }}</strong>
        {{ todo.action }}
        <a :href="todo.target.href">{{ todo.target.label }}</a>
      </div>
      <div class="md-todos__item-meta">{{ todo.project }} · {{ todo.when }}</div>
    </div>

    <button
      v-if="isPending"
      type="button"
      class="md-todos__item-action"
      @click="$emit('mark-done', todo.id)"
    >
      <md-icon name="check" :size="16" />
      Done
    </button>
    <button
      v-else
      type="button"
      class="md-todos__item-action md-todos__item-action--quiet"
      @click="$emit('restore', todo.id)"
    >
      <md-icon name="undo" :size="16" />
      Restore
    </button>
  </li>
</template>
