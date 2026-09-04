<script>
import { glSlotsMixin } from '~/lib/utils/vue3compat/gl_slots_mixin';

const VARIANTS = ['elevated', 'filled', 'outlined'];

export default {
  name: 'Md3Card',
  inheritAttrs: false,
  mixins: [glSlotsMixin],
  props: {
    variant: {
      type: String,
      required: false,
      default: 'elevated',
      validator: (value) => VARIANTS.includes(value),
    },
    interactive: {
      type: Boolean,
      required: false,
      default: false,
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
    ariaLabel: {
      type: String,
      required: false,
      default: null,
    },
  },
  computed: {
    tag() {
      if (!this.interactive) return 'div';
      return this.href ? 'a' : 'div';
    },
    isInteractiveDiv() {
      return this.interactive && !this.href;
    },
    tabIndexValue() {
      if (!this.interactive) return null;
      if (this.disabled) return -1;
      return this.isInteractiveDiv ? 0 : null;
    },
    classes() {
      return [
        'md3-card',
        `md3-card--${this.variant}`,
        {
          'md3-card--interactive': this.interactive,
          'md3-card--disabled': this.interactive && this.disabled,
        },
      ];
    },
    rootListeners() {
      return {
        ...this.$listeners,
        click: this.handleClick,
        keydown: this.handleKeydown,
      };
    },
  },
  methods: {
    handleClick(event) {
      if (!this.interactive) return;
      if (this.disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.$emit('click', event);
    },
    handleKeydown(event) {
      if (!this.isInteractiveDiv || this.disabled) return;
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        this.$emit('click', event);
      }
    },
  },
};
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="classes"
    :href="tag === 'a' && !disabled ? href : null"
    :role="isInteractiveDiv ? 'button' : null"
    :tabindex="tabIndexValue"
    :aria-disabled="interactive && disabled ? 'true' : null"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    v-on="rootListeners"
  >
    <div v-if="glSlots().header" class="md3-card__header"><slot name="header" /></div>
    <div class="md3-card__body"><slot /></div>
    <div v-if="glSlots().actions" class="md3-card__actions"><slot name="actions" /></div>
  </component>
</template>
