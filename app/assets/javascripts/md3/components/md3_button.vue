<script>
const VARIANTS = ['filled', 'tonal', 'outlined', 'text', 'elevated'];
const SIZES = ['medium', 'small'];
const TYPES = ['button', 'submit', 'reset'];

export default {
  name: 'Md3Button',
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      required: false,
      default: 'filled',
      validator: (value) => VARIANTS.includes(value),
    },
    size: {
      type: String,
      required: false,
      default: 'medium',
      validator: (value) => SIZES.includes(value),
    },
    type: {
      type: String,
      required: false,
      default: 'button',
      validator: (value) => TYPES.includes(value),
    },
    href: {
      type: String,
      required: false,
      default: null,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    loading: {
      type: Boolean,
      required: false,
      default: false,
    },
    icon: {
      type: String,
      required: false,
      default: null,
    },
    trailingIcon: {
      type: String,
      required: false,
      default: null,
    },
    iconOnly: {
      type: Boolean,
      required: false,
      default: false,
    },
    ariaLabel: {
      type: String,
      required: false,
      default: null,
    },
  },
  computed: {
    tag() {
      return this.href ? 'a' : 'button';
    },
    isDisabled() {
      return this.disabled || this.loading;
    },
    classes() {
      return [
        'md3-button',
        `md3-button--${this.variant}`,
        `md3-button--${this.size}`,
        {
          'md3-button--icon-only': this.iconOnly,
          'md3-button--loading': this.loading,
          'md3-button--disabled': this.disabled,
        },
      ];
    },
    rootListeners() {
      return {
        ...this.$listeners,
        click: this.handleClick,
      };
    },
  },
  methods: {
    handleClick(event) {
      if (this.isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.$emit('click', event);
    },
  },
};
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="classes"
    :type="tag === 'button' ? type : null"
    :href="tag === 'a' && !isDisabled ? href : null"
    :disabled="tag === 'button' ? isDisabled : null"
    :aria-disabled="tag === 'a' && isDisabled ? 'true' : null"
    :tabindex="tag === 'a' && isDisabled ? -1 : null"
    :aria-busy="loading ? 'true' : null"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    v-on="rootListeners"
  >
    <span v-if="loading" class="md3-button__spinner" aria-hidden="true"></span>
    <span
      v-if="icon && !loading"
      class="material-symbols-outlined md3-button__icon"
      :class="iconOnly ? 'md3-button__icon--only' : 'md3-button__icon--start'"
      aria-hidden="true"
      >{{ icon }}</span
    >
    <span v-if="!iconOnly" class="md3-button__label"><slot /></span>
    <span
      v-if="trailingIcon && !iconOnly && !loading"
      class="material-symbols-outlined md3-button__icon md3-button__icon--end"
      aria-hidden="true"
      >{{ trailingIcon }}</span
    >
  </component>
</template>
