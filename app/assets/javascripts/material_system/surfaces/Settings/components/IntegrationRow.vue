<template>
  <div class="st-row" data-screen-label="Integration row">
    <input
      type="checkbox"
      class="st-row__checkbox"
      :checked="selected"
      :aria-label="`Select ${integration.name}`"
      @change="$emit('toggle-select', integration.id)"
    />
    <StIcon :name="integration.icon" class="st-row__icon" />
    <div class="st-row__info">
      <div class="st-row__name">{{ integration.name }}</div>
      <div class="st-row__desc">{{ integration.desc }}</div>
    </div>
    <button
      type="button"
      role="switch"
      class="st-switch"
      :class="{ 'st-switch--on': integration.on }"
      :aria-checked="integration.on"
      :aria-label="`${integration.name} ${integration.on ? 'enabled' : 'disabled'}`"
      @click="$emit('toggle', integration.id)"
    >
      <span class="st-switch__knob"></span>
    </button>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';

export default {
  name: 'IntegrationRow',
  components: { StIcon },
  props: {
    integration: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>

<style lang="scss" scoped>
.st-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--st-outlv);
}

.st-row__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--st-prim);
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-row__icon {
  color: var(--st-onsurfv);
  flex-shrink: 0;
}

.st-row__info {
  flex: 1;
  min-width: 0;
}

.st-row__name {
  font-weight: 500;
  font-size: 13.5px;
}

.st-row__desc {
  font-size: 12px;
  color: var(--st-onsurfv);
}

.st-switch {
  width: 46px;
  height: 26px;
  border-radius: 999px;
  cursor: pointer;
  position: relative;
  background: var(--st-surfch);
  border: none;
  flex-shrink: 0;
  transition: background 0.15s;

  &--on {
    background: var(--st-prim);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: left 0.15s;

  .st-switch--on & {
    left: 23px;
  }
}
</style>
