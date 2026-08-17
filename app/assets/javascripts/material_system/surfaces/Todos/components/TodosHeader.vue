<script>
import MdIcon from './MdIcon.vue';
import { TODO_VIEWS } from '../data';

export default {
  name: 'TodosHeader',
  components: { MdIcon },
  props: {
    view: {
      type: String,
      default: TODO_VIEWS.PENDING,
    },
    pendingCount: {
      type: Number,
      default: 0,
    },
    doneCount: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    views() {
      return TODO_VIEWS;
    },
  },
};
</script>

<template>
  <div class="md-todos__header">
    <h1 class="md-todos__title">To-Do list</h1>

    <div class="md-todos__tabs" role="tablist" aria-label="To-do list views">
      <button
        id="todos-tab-pending"
        type="button"
        role="tab"
        class="md-todos__tab"
        :class="{ 'md-todos__tab--active': view === views.PENDING }"
        :aria-selected="view === views.PENDING"
        aria-controls="todos-panel"
        @click="$emit('change-view', views.PENDING)"
      >
        To do · {{ pendingCount }}
      </button>
      <button
        id="todos-tab-done"
        type="button"
        role="tab"
        class="md-todos__tab"
        :class="{ 'md-todos__tab--active': view === views.DONE }"
        :aria-selected="view === views.DONE"
        aria-controls="todos-panel"
        @click="$emit('change-view', views.DONE)"
      >
        Done · {{ doneCount }}
      </button>
    </div>

    <button
      type="button"
      class="md-todos__mark-all"
      :disabled="pendingCount === 0"
      @click="$emit('mark-all-done')"
    >
      <md-icon name="done_all" :size="18" />
      Mark all done
    </button>
  </div>
</template>
