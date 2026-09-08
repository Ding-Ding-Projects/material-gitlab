<template>
  <div class="secure-confirm-scrim" @mousedown.self="cancel">
    <div
      ref="root"
      class="secure-confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      @keydown.esc="cancel"
      @keydown.tab="trapFocus"
    >
      <h2 :id="titleId" class="secure-confirm__title">{{ title }}</h2>
      <p :id="descriptionId" class="secure-confirm__description">{{ description }}</p>
      <div class="secure-confirm__actions">
        <material-button ref="cancelButton" variant="text" type="button" class="secure-confirm__button" @click="cancel">
          {{ cancelLabel }}
        </material-button>
        <material-button variant="filled" type="button" class="secure-confirm__button secure-confirm__button--danger" @click="confirm">
          {{ confirmLabel }}
        </material-button>
      </div>
    </div>
  </div>
</template>

<script>
import { uniqueId } from 'lodash';
import MaterialButton from '../../../components/material_button';

export default {
  name: 'SecureConfirmDialog',
  components: { MaterialButton },
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
  },
  data() {
    return {
      titleId: uniqueId('secure-confirm-title-'),
      descriptionId: uniqueId('secure-confirm-description-'),
    };
  },
  mounted() {
    this.$nextTick(() => this.$refs.cancelButton && this.$refs.cancelButton.focus());
  },
  methods: {
    focusable() {
      return Array.from(this.$refs.root.querySelectorAll('a[href], button, input, select, textarea, md-filled-button, md-outlined-button, md-filled-tonal-button, md-elevated-button, md-text-button, md-filled-text-field, [tabindex]:not([tabindex="-1"])'));
    },
    trapFocus(event) {
      const elements = this.focusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    cancel() {
      this.$emit('cancel');
    },
    confirm() {
      this.$emit('confirm');
    },
  },
};
</script>
