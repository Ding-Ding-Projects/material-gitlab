<template>
  <div class="mg-card" data-screen-label="Labels">
    <MgSelectionToolbar
      v-if="labels.length > 0"
      :visible-count="labels.length"
      :selected-count="selectedIds.length"
      item-noun="labels"
      @select-all="$emit('select-all')"
      @clear="$emit('clear-selection')"
      @invert="$emit('invert-selection')"
    >
      <button type="button" class="mg-btn mg-btn--danger" @click="$emit('request-delete', { mode: 'bulk', ids: selectedIds })">
        <MgIcon name="delete" size="small" /> Delete selected
      </button>
    </MgSelectionToolbar>

    <ul class="mg-list" role="list" aria-label="Labels">
      <li v-for="lb in labels" :key="lb.id" class="mg-label-row" :class="{ 'mg-label-row--selected': selectedIds.includes(lb.id) }">
        <label class="mg-label-row__select">
          <input
            type="checkbox"
            :checked="selectedIds.includes(lb.id)"
            :aria-label="`Select label: ${lb.name}`"
            @change="$emit('toggle-select', lb.id)"
          />
        </label>
        <span class="mg-label-row__chip" :style="{ background: lb.color, color: lb.textColor }">{{ lb.name }}</span>
        <span class="mg-label-row__desc">{{ lb.description }}</span>
        <span class="mg-label-row__count">{{ lb.openIssuesCount }} open issues</span>
        <button
          type="button"
          class="mg-label-row__delete"
          :aria-label="`Delete label ${lb.name}`"
          @click="$emit('request-delete', { mode: 'single', ids: [lb.id] })"
        >
          <MgIcon name="delete" size="small" />
        </button>
      </li>
    </ul>

    <div v-if="labels.length === 0" class="mg-empty-state">{{ emptyMessage }}</div>
  </div>
</template>

<script>
import MgIcon from './MgIcon.vue';
import MgSelectionToolbar from './MgSelectionToolbar.vue';

export default {
  name: 'LabelsList',
  components: { MgIcon, MgSelectionToolbar },
  props: {
    labels: { type: Array, required: true },
    selectedIds: { type: Array, default: () => [] },
    emptyMessage: { type: String, default: 'No labels match your search.' },
  },
};
</script>

<style lang="scss" scoped>
.mg-card {
  background: var(--mg-card);
  border-radius: var(--mg-radius-card);
  overflow: hidden;
  box-shadow: var(--mg-elevation-1);
  max-width: 920px;
}

.mg-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mg-label-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--mg-outlv);

  &:last-child {
    border-bottom: none;
  }

  &--selected {
    background: var(--mg-surfcl);
  }
}

.mg-label-row__select {
  display: flex;
  align-items: center;
  min-height: var(--mg-touch);

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--mg-prim);
  }

  input:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-label-row__chip {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 14px;
  border-radius: var(--mg-radius-pill);
  flex-shrink: 0;
}

.mg-label-row__desc {
  flex: 1;
  font-size: 12.5px;
  color: var(--mg-onsurfv);
  min-width: 0;
  overflow-wrap: anywhere;
}

.mg-label-row__count {
  font-size: 12px;
  color: var(--mg-onsurfv);
  white-space: nowrap;
}

.mg-label-row__delete {
  width: var(--mg-touch);
  height: var(--mg-touch);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--mg-err);
  border: none;
  background: transparent;
  border-radius: var(--mg-radius-pill);
  flex-shrink: 0;

  &:hover {
    background: var(--mg-errc);
  }
  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-empty-state {
  padding: 36px;
  text-align: center;
  color: var(--mg-onsurfv);
  font-size: 13.5px;
}

.mg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--mg-radius-pill);
  padding: 6px 12px;
  font: inherit;
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  border: none;
  min-height: 32px;
}

.mg-btn--danger {
  background: var(--mg-errc);
  color: var(--mg-err);

  &:hover {
    filter: brightness(0.97);
  }
  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}
</style>
