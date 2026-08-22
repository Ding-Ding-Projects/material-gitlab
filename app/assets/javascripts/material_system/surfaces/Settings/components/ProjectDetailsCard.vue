<template>
  <div class="st-card" data-screen-label="Project details">
    <div class="st-card__title">Project</div>
    <label class="st-field">
      Project name
      <input
        type="text"
        class="st-field__input"
        :value="draftName"
        @input="draftName = $event.target.value"
        @blur="$emit('update:project-name', draftName)"
      />
    </label>
    <div class="st-field">
      Visibility
      <div class="st-chip-row" role="radiogroup" aria-label="Project visibility">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="radio"
          class="st-chip"
          :class="{ 'st-chip--active': option.value === visibility }"
          :aria-checked="option.value === visibility"
          @click="$emit('update:visibility', option.value)"
        >
          <StIcon :name="option.icon" size="small" />
          {{ option.value }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { VISIBILITY_OPTIONS } from '../data';

export default {
  name: 'ProjectDetailsCard',
  components: { StIcon },
  props: {
    projectName: { type: String, required: true },
    visibility: { type: String, required: true },
  },
  data() {
    return { options: VISIBILITY_OPTIONS, draftName: this.projectName };
  },
  watch: {
    projectName(value) {
      this.draftName = value;
    },
  },
};
</script>

<style lang="scss" scoped>
.st-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  color: var(--st-onsurfv);
}

.st-field__input {
  border: 1px solid var(--st-outl);
  border-radius: var(--st-radius-field);
  padding: 11px 14px;
  font: inherit;
  font-size: 14px;
  background: transparent;
  color: var(--st-onsurf);
  outline: none;
  max-width: 380px;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 1px;
  }
}

.st-chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.st-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--st-outl);
  background: transparent;
  color: var(--st-onsurf);
  min-height: var(--st-touch);

  &--active {
    border-color: var(--st-primc);
    background: var(--st-primc);
    color: var(--st-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}
</style>
