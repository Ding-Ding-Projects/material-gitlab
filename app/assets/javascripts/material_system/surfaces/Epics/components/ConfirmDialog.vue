<script>
import { __ } from '~/locale';

export default {
  name: 'ConfirmDialog',
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: () => __('Delete') },
    danger: { type: Boolean, default: true },
  },
  mounted() {
    this._onKeydown = (event) => {
      if (event.key === 'Escape') this.$emit('cancel');
    };
    window.addEventListener('keydown', this._onKeydown);
    this.$refs.cancelBtn.focus();
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
  },
  methods: {
    stop(event) {
      event.stopPropagation();
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__scrim" role="presentation" @click="$emit('cancel')">
    <div
      class="gl-mds-epics__dialog gl-mds-epics__dialog--confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-label="title"
      aria-describedby="epics-confirm-message"
      @click="stop"
    >
      <h2 class="gl-mds-epics__dialog-title">{{ title }}</h2>
      <p id="epics-confirm-message" class="gl-mds-epics__confirm-body">{{ message }}</p>
      <div class="gl-mds-epics__dialog-actions">
        <button ref="cancelBtn" type="button" class="gl-mds-epics__btn" @click="$emit('cancel')">
          {{ __('Cancel') }}
        </button>
        <button
          type="button"
          class="gl-mds-epics__btn"
          :class="danger ? 'gl-mds-epics__btn--danger' : 'gl-mds-epics__btn--filled'"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
