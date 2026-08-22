<template>
  <main class="gl-mds-board-view" aria-label="Issue board">
    <board-column
      v-for="col in columns"
      :key="col.key"
      :column="col"
      :all-columns="columns"
      :adding-col="addingCol"
      :draft="draft"
      @drop="$emit('drop', $event)"
      @card-open="$emit('open', $event)"
      @card-drag-start="$emit('drag-start', $event)"
      @card-move="$emit('move', $event)"
      @start-add="$emit('start-add', $event)"
      @cancel-add="$emit('cancel-add')"
      @update-draft="$emit('update-draft', $event)"
      @confirm-add="$emit('confirm-add', $event)"
    />
  </main>
</template>

<script>
import BoardColumn from './BoardColumn.vue';

export default {
  name: 'IssueBoardView',
  components: { BoardColumn },
  props: {
    columns: { type: Array, required: true },
    addingCol: { type: String, default: null },
    draft: { type: String, default: '' },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-board-view {
  flex: 1;
  overflow-x: auto;
  display: flex;
  gap: 14px;
  padding: 0 24px 24px;
  align-items: flex-start;
}
</style>
