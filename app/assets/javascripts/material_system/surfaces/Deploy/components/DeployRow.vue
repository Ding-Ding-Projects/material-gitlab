<template>
  <div class="dp-row" :class="{ 'dp-row--selected': selected }">
    <label class="dp-row__select">
      <input
        type="checkbox"
        :checked="selected"
        :aria-label="`Select ${row.title}`"
        @change="$emit('toggle-select', row.id)"
      />
    </label>
    <DpIcon :name="row.icon" class="dp-row__icon" :style="{ color: row.iconColor }" />
    <div class="dp-row__text">
      <div class="dp-row__title" :class="{ 'dp-row__title--mono': row.titleMono }">{{ row.title }}</div>
      <div class="dp-row__sub">{{ row.sub }}</div>
    </div>
    <span v-if="row.badge" class="dp-row__badge" :style="{ background: row.badgeBg, color: row.badgeFg }">
      {{ row.badge }}
    </span>
    <span class="dp-row__meta">{{ row.meta }}</span>
    <button
      v-if="row.action"
      type="button"
      class="dp-row__action"
      :style="{ color: row.actionColor }"
      @click="$emit('act', row.id)"
    >
      {{ row.action }}
    </button>
  </div>
</template>

<script>
import DpIcon from './DpIcon.vue';

export default {
  name: 'DeployRow',
  components: { DpIcon },
  props: {
    row: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>

<style lang="scss" scoped>
.dp-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--dp-outlv);

  &:last-child {
    border-bottom: none;
  }

  &--selected {
    background: var(--dp-surfcl);
  }

  &:hover {
    background: var(--dp-surfcl);
  }
}

.dp-row__select {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--dp-prim);
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--dp-prim);
      outline-offset: 2px;
    }
  }
}

.dp-row__icon {
  flex-shrink: 0;
  font-size: 19px;
}

.dp-row__text {
  flex: 1;
  min-width: 0;
}

.dp-row__title {
  font-weight: 500;
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp-row__title--mono {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.dp-row__sub {
  font-size: 12px;
  color: var(--dp-onsurfv);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp-row__badge {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 999px;
}

.dp-row__meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-onsurfv);
  white-space: nowrap;
}

.dp-row__action {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--dp-outl);
  border-radius: 999px;
  padding: 6px 14px;
  background: transparent;
  font-family: inherit;

  &:hover {
    background: var(--dp-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}
</style>
