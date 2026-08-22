<template>
  <div class="am-selection-toolbar" role="toolbar" :aria-label="`${itemLabelPlural} bulk actions`">
    <span class="am-selection-toolbar__scope">
      <strong>{{ selectedCount }}</strong> selected of {{ visibleCount }} shown
      <span v-if="hiddenCount > 0" class="am-selection-toolbar__hidden">
        ({{ hiddenCount }} hidden by filter)
      </span>
    </span>
    <button type="button" class="am-btn am-btn--text" @click="$emit('select-all')">
      Select all {{ visibleCount }} shown
    </button>
    <button type="button" class="am-btn am-btn--text" @click="$emit('invert')">Invert selection</button>
    <button type="button" class="am-btn am-btn--text" @click="$emit('clear')">Clear</button>
    <span class="am-selection-toolbar__spacer"></span>
    <slot name="actions" />
  </div>
</template>

<script>
export default {
  name: 'SelectionToolbar',
  props: {
    selectedCount: {
      type: Number,
      required: true,
    },
    visibleCount: {
      type: Number,
      required: true,
    },
    totalCount: {
      type: Number,
      required: true,
    },
    itemLabelPlural: {
      type: String,
      default: 'items',
    },
  },
  computed: {
    hiddenCount() {
      return Math.max(this.totalCount - this.visibleCount, 0);
    },
  },
};
</script>
