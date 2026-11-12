<script>
import { GlAlert, GlModal } from '@gitlab/ui';
import SuperConfirmation from '~/material_system/components/super_confirmation.vue';
import SafeHtml from '~/vue_shared/directives/safe_html';
import { __ } from '~/locale';
import {
  CONFIRM_DANGER_MODAL_BUTTON,
  CONFIRM_DANGER_MODAL_TITLE,
  CONFIRM_DANGER_PHRASE_TEXT,
  CONFIRM_DANGER_WARNING,
  CONFIRM_DANGER_MODAL_CANCEL,
} from './constants';

export default {
  name: 'ConfirmDangerModal',
  components: {
    GlAlert,
    GlModal,
    SuperConfirmation,
  },
  directives: {
    SafeHtml,
  },
  inject: {
    htmlConfirmationMessage: {
      default: false,
    },
    confirmDangerMessage: {
      default: '',
    },
    confirmButtonText: {
      default: CONFIRM_DANGER_MODAL_BUTTON,
    },
    additionalInformation: {
      default: CONFIRM_DANGER_WARNING,
    },
    cancelButtonText: {
      default: CONFIRM_DANGER_MODAL_CANCEL,
    },
  },
  model: {
    prop: 'visible',
    event: 'change',
  },
  props: {
    visible: {
      type: Boolean,
      required: false,
      default: null,
    },
    modalId: {
      type: String,
      required: true,
    },
    phrase: {
      type: String,
      required: true,
    },
    confirmLoading: {
      type: Boolean,
      required: false,
      default: false,
    },
    modalTitle: {
      type: String,
      required: false,
      default: CONFIRM_DANGER_MODAL_TITLE,
    },
    // Kept for API compatibility. Nothing is typed any more: the phrase is shown as the
    // thing affected, and the two-key slider is the confirmation.
    phraseLabel: {
      type: String,
      required: false,
      default: CONFIRM_DANGER_PHRASE_TEXT,
    },
  },
  emits: ['change', 'confirm'],
  watch: {
    confirmLoading(isLoading, wasLoading) {
      // If the button was loading and now no longer is
      if (!isLoading && wasLoading) {
        // Hide the modal
        this.$emit('change', false);
      }
    },
  },
  methods: {
    authorize() {
      this.$emit('confirm', { preventDefault() {} });
    },
    exit() {
      this.$refs.modal.hide();
    },
    focusFirstKey() {
      this.$nextTick(() => {
        this.$el?.querySelector?.('[data-testid="super-confirmation-key-1"]')?.focus();
      });
    },
    resetConfirmation() {
      this.$refs.superConfirmation?.reset();
    },
  },
  i18n: {
    AFFECTS: __('This affects:'),
    CONFIRM_DANGER_MODAL_BUTTON,
    CONFIRM_DANGER_MODAL_TITLE,
    CONFIRM_DANGER_WARNING,
  },
};
</script>
<template>
  <gl-modal
    ref="modal"
    :visible="visible"
    :modal-id="modalId"
    :data-testid="modalId"
    :title="modalTitle"
    @change="$emit('change', $event)"
    @shown="focusFirstKey()"
    @hidden="resetConfirmation()"
  >
    <gl-alert
      v-if="confirmDangerMessage"
      variant="danger"
      data-testid="confirm-danger-message"
      :dismissible="false"
      class="gl-mb-4"
    >
      <span v-if="htmlConfirmationMessage" v-safe-html="confirmDangerMessage"></span>
      <span v-else>
        {{ confirmDangerMessage }}
      </span>
    </gl-alert>
    <slot name="modal-body">
      <p data-testid="confirm-danger-warning">
        {{ additionalInformation }}
      </p>
    </slot>
    <p data-testid="confirm-danger-phrase" class="gl-mb-3">
      {{ $options.i18n.AFFECTS }}
      <code class="gl-whitespace-pre-wrap">{{ phrase }}</code>
    </p>
    <super-confirmation
      ref="superConfirmation"
      :target="phrase"
      :loading="confirmLoading"
      @authorized="authorize"
      @exit="exit"
    />
    <slot name="modal-footer"></slot>
  </gl-modal>
</template>
