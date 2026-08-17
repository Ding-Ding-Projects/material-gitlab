<template>
  <div class="st-var-row" data-screen-label="CI/CD variable row">
    <input
      type="checkbox"
      class="st-var-row__checkbox"
      :checked="selected"
      :aria-label="`Select variable ${variable.key}`"
      @change="$emit('toggle-select', variable.id)"
    />
    <span class="st-var-row__key">{{ variable.key }}</span>
    <span class="st-var-row__value">{{ shownValue }}</span>
    <button
      type="button"
      class="st-var-row__icon-btn"
      :aria-label="variable.revealed ? `Hide value for ${variable.key}` : `Reveal value for ${variable.key}`"
      @click="$emit('toggle-reveal', variable.id)"
    >
      <StIcon :name="variable.revealed ? 'visibility_off' : 'visibility'" size="small" />
    </button>
    <span v-if="variable.protected" class="st-badge st-badge--warn">protected</span>
    <button type="button" class="st-var-row__icon-btn st-var-row__icon-btn--danger" :aria-label="`Delete ${variable.key}`" @click="$emit('remove', variable.id)">
      <StIcon name="delete" size="small" />
    </button>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { maskedValue } from '../data';

export default {
  name: 'VariableRow',
  components: { StIcon },
  props: {
    variable: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  computed: {
    shownValue() {
      return this.variable.revealed ? this.variable.value : maskedValue();
    },
  },
};
</script>

<style lang="scss" scoped>
.st-var-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--st-outlv);
  border-radius: 12px;
  padding: 10px 14px;
}

.st-var-row__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--st-prim);
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-var-row__key {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  font-weight: 700;
  min-width: 180px;
}

.st-var-row__value {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12.5px;
  color: var(--st-onsurfv);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st-var-row__icon-btn {
  border: none;
  background: transparent;
  color: var(--st-onsurfv);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }

  &--danger {
    color: var(--st-err);
  }
}

.st-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.st-badge--warn {
  background: var(--st-warnc);
  color: var(--st-warn);
}
</style>
