<script>
import { uniqueId } from 'lodash-es';
import { __ } from '~/locale';
import { glSlotsMixin } from '~/lib/utils/vue3compat/gl_slots_mixin';
import Md3Button from './md3_button.vue';

const SIZES = ['small', 'medium', 'large'];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default {
  name: 'Md3Dialog',
  components: { Md3Button },
  mixins: [glSlotsMixin],
  props: {
    visible: {
      type: Boolean,
      required: false,
      default: false,
    },
    title: {
      type: String,
      required: false,
      default: null,
    },
    ariaLabel: {
      type: String,
      required: false,
      default: null,
    },
    size: {
      type: String,
      required: false,
      default: 'medium',
      validator: (value) => SIZES.includes(value),
    },
    closeOnBackdrop: {
      type: Boolean,
      required: false,
      default: true,
    },
    closeOnEscape: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  data() {
    return {
      titleId: uniqueId('md3-dialog-title-'),
      previouslyFocusedElement: null,
    };
  },
  computed: {
    closeLabel() {
      return __('Close dialog');
    },
  },
  watch: {
    visible(isVisible) {
      if (isVisible) {
        this.activate();
      } else {
        this.deactivate();
      }
    },
  },
  mounted() {
    if (this.visible) this.activate();
  },
  beforeDestroy() {
    this.deactivate();
  },
  methods: {
    getFocusableElements() {
      if (!this.$refs.panel) return [];
      return Array.from(this.$refs.panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );
    },
    activate() {
      this.previouslyFocusedElement = document.activeElement;
      document.addEventListener('keydown', this.handleKeydown);
      this.$nextTick(() => {
        const [firstFocusable] = this.getFocusableElements();
        if (firstFocusable) {
          firstFocusable.focus();
        } else if (this.$refs.panel) {
          this.$refs.panel.setAttribute('tabindex', '-1');
          this.$refs.panel.focus();
        }
      });
    },
    deactivate() {
      document.removeEventListener('keydown', this.handleKeydown);
      const restoreTarget = this.previouslyFocusedElement;
      this.previouslyFocusedElement = null;
      if (restoreTarget && typeof restoreTarget.focus === 'function' && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        if (this.closeOnEscape) {
          event.stopPropagation();
          this.requestClose();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = this.getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const isOutside = !this.$refs.panel || !this.$refs.panel.contains(current);
      if (event.shiftKey) {
        if (current === first || isOutside) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last || isOutside) {
        event.preventDefault();
        first.focus();
      }
    },
    handleBackdropClick() {
      if (this.closeOnBackdrop) this.requestClose();
    },
    requestClose() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <transition name="md3-dialog-fade">
    <div v-if="visible" class="md3-dialog-overlay" @click.self="handleBackdropClick">
      <div
        ref="panel"
        class="md3-dialog"
        :class="[`md3-dialog--${size}`]"
        role="dialog"
        aria-modal="true"
        :aria-label="!title ? ariaLabel : null"
        :aria-labelledby="title ? titleId : null"
      >
        <div class="md3-dialog__header">
          <h2 v-if="title" :id="titleId" class="md3-dialog__title">{{ title }}</h2>
          <md3-button
            variant="text"
            size="small"
            icon-only
            icon="close"
            class="md3-dialog__close"
            :aria-label="closeLabel"
            @click="requestClose"
          />
        </div>
        <div class="md3-dialog__body">
          <slot />
        </div>
        <div v-if="glSlots().actions" class="md3-dialog__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </transition>
</template>
