<template>
  <div
    class="gl-mds-board-card"
    draggable="true"
    @dragstart="$emit('drag-start', card.id)"
  >
    <button type="button" class="gl-mds-board-card__open" @click="$emit('open', card.id)">
      {{ card.title }}
    </button>
    <div class="gl-mds-board-card__footer">
      <label-chip v-for="label in card.labels.slice(0, 1)" :key="label" :label="label" size="sm" />
      <span class="gl-mds-board-card__iid">#{{ card.iid }}</span>
      <label class="gl-mds-board-card__move">
        <span class="gl-mds-sr-only">Move issue #{{ card.iid }} to column</span>
        <select :value="card.col" @change="$emit('move', { id: card.id, col: $event.target.value })">
          <option v-for="col in columns" :key="col.key" :value="col.key">{{ col.name }}</option>
        </select>
      </label>
      <div class="gl-mds-board-card__avatar" :title="card.assignee">{{ card.avatar }}</div>
    </div>
  </div>
</template>

<script>
import LabelChip from './LabelChip.vue';

export default {
  name: 'BoardCard',
  components: { LabelChip },
  props: {
    card: { type: Object, required: true },
    columns: { type: Array, required: true },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-board-card {
  background: var(--gl-mds-card);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:active { cursor: grabbing; }
}

.gl-mds-board-card__open {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  font: inherit;
  font-weight: 500;
  font-size: 13.5px;
  color: var(--gl-mds-onsurf);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.gl-mds-board-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.gl-mds-board-card__iid {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-board-card__move select {
  font-size: 11px;
  border: 1px solid var(--gl-mds-outl);
  border-radius: 6px;
  background: transparent;
  color: var(--gl-mds-onsurfv);
  padding: 2px 4px;
  max-width: 84px;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 1px;
  }
}

.gl-mds-board-card__avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--gl-mds-sec);
  color: var(--gl-mds-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-weight: 700;
  flex-shrink: 0;
}

.gl-mds-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
