<script>
import { __ } from '~/locale';

const VARIANTS = ['assist', 'filter', 'input', 'suggestion'];

export default {
  name: 'Md3Chip',
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      required: false,
      default: 'assist',
      validator: (value) => VARIANTS.includes(value),
    },
    label: {
      type: String,
      required: false,
      default: null,
    },
    selected: {
      type: Boolean,
      required: false,
      default: false,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    removable: {
      type: Boolean,
      required: false,
      default: false,
    },
    removeLabel: {
      type: String,
      required: false,
      default: () => __('Remove'),
    },
    icon: {
      type: String,
      required: false,
      default: null,
    },
    color: {
      type: String,
      required: false,
      default: null,
    },
    textColor: {
      type: String,
      required: false,
      default: null,
    },
  },
  computed: {
    classes() {
      return [
        `md3-chip--${this.variant}`,
        {
          'md3-chip--selected': this.selected,
          'md3-chip--disabled': this.disabled,
          'md3-chip--removable': this.removable,
        },
      ];
    },
    // Per-label colors come from project/user data, not the design token set,
    // so they are threaded through as custom properties rather than inline rules.
    chipStyle() {
      const style = {};
      if (this.color) style['--md3-chip-color'] = this.color;
      if (this.textColor) style['--md3-chip-text-color'] = this.textColor;
      return style;
    },
    actionListeners() {
      return {
        ...this.$listeners,
        click: this.handleClick,
      };
    },
  },
  methods: {
    handleClick(event) {
      if (this.disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.$emit('click', event);
    },
    handleRemove(event) {
      if (this.disabled) return;
      event.stopPropagation();
      this.$emit('remove', event);
    },
  },
};
</script>

<template>
  <div class="md3-chip" :class="classes" :style="chipStyle">
    <button
      type="button"
      class="md3-chip__action"
      :aria-pressed="variant === 'filter' ? String(Boolean(selected)) : null"
      :disabled="disabled"
      v-bind="$attrs"
      v-on="actionListeners"
    >
      <span v-if="icon" class="material-symbols-outlined md3-chip__icon" aria-hidden="true">{{
        icon
      }}</span>
      <span class="md3-chip__label"><slot>{{ label }}</slot></span>
    </button>
    <button
      v-if="removable"
      type="button"
      class="md3-chip__remove"
      :aria-label="removeLabel"
      :disabled="disabled"
      @click="handleRemove"
    >
      <span class="material-symbols-outlined" aria-hidden="true">close</span>
    </button>
  </div>
</template>
