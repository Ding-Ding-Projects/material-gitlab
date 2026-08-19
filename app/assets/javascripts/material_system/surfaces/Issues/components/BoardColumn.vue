<template>
  <div
    class="gl-mds-board-col"
    role="group"
    :aria-label="`${column.name}, ${column.cards.length} issues`"
    @dragover.prevent
    @drop.prevent="$emit('drop', column.key)"
  >
    <div class="gl-mds-board-col__header">
      <span class="gl-mds-board-col__dot" :style="{ background: `var(${column.dotVar})` }" aria-hidden="true"></span>
      <span class="gl-mds-board-col__name">{{ column.name }}</span>
      <span class="gl-mds-board-col__count">{{ column.cards.length }}</span>
    </div>

    <board-card
      v-for="card in column.cards"
      :key="card.id"
      :card="card"
      :columns="allColumns"
      @open="$emit('card-open', $event)"
      @drag-start="$emit('card-drag-start', $event)"
      @move="$emit('card-move', $event)"
    />

    <div v-if="isAdding" class="gl-mds-board-col__add-form">
      <label class="gl-mds-sr-only" :for="`gl-mds-quick-add-${column.key}`">New issue title for {{ column.name }}</label>
      <input
        :id="`gl-mds-quick-add-${column.key}`"
        class="gl-mds-board-col__add-input"
        type="text"
        :value="draft"
        placeholder="Issue title"
        autofocus
        @input="$emit('update-draft', $event.target.value)"
        @keydown.enter="$emit('confirm-add', column.key)"
        @keydown.esc="$emit('cancel-add')"
      />
      <div class="gl-mds-board-col__add-actions">
        <button type="button" class="gl-mds-board-col__cancel" @click="$emit('cancel-add')">Cancel</button>
        <button type="button" class="gl-mds-board-col__confirm" @click="$emit('confirm-add', column.key)">Add</button>
      </div>
    </div>
    <button v-else type="button" class="gl-mds-board-col__start-add" @click="$emit('start-add', column.key)">
      <mds-icon name="add" size="sm" />Add issue
    </button>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';
import BoardCard from './BoardCard.vue';

export default {
  name: 'BoardColumn',
  components: { MdsIcon, BoardCard },
  props: {
    column: { type: Object, required: true },
    allColumns: { type: Array, required: true },
    addingCol: { type: String, default: null },
    draft: { type: String, default: '' },
  },
  computed: {
    isAdding() {
      return this.addingCol === this.column.key;
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-board-col {
  width: 290px;
  flex-shrink: 0;
  background: var(--gl-mds-surfc);
  border-radius: 20px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100%;
  overflow-y: auto;
}

.gl-mds-board-col__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px;
}

.gl-mds-board-col__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.gl-mds-board-col__name {
  font-weight: 500;
  font-size: 13.5px;
}

.gl-mds-board-col__count {
  margin-left: auto;
  font-size: 12px;
  color: var(--gl-mds-onsurfv);
  background: var(--gl-mds-surfch);
  border-radius: 999px;
  padding: 2px 9px;
}

.gl-mds-board-col__add-form {
  background: var(--gl-mds-card);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gl-mds-board-col__add-input {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 1px;
  }
}

.gl-mds-board-col__add-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.gl-mds-board-col__cancel,
.gl-mds-board-col__confirm {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  border: none;
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-board-col__cancel {
  background: none;
  color: var(--gl-mds-onprimc);
}

.gl-mds-board-col__confirm {
  background: var(--gl-mds-prim);
  color: var(--gl-mds-onprim);
  font-weight: 500;
}

.gl-mds-board-col__start-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--gl-mds-onprimc);
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;

  &:hover { background: var(--gl-mds-surfch); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
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
