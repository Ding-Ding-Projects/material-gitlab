<script>
import { GlModal, GlSprintf } from '@gitlab/ui';
import SuperConfirmation from '~/material_system/components/super_confirmation.vue';
import { uniqueId } from 'lodash-es';
import { __, s__, sprintf } from '~/locale';
import { RESOURCE_TYPES } from '~/groups_projects/constants';
import { getCurrentUtcDate, getDayDifference, newDate } from '~/lib/utils/datetime_utility';
import PermanentDeletionConfirmCheckbox from '~/groups_projects/components/permanent_deletion_confirm_checkbox.vue';

export default {
  name: 'GroupsProjectsDeleteModal',
  resourceStrings: {
    [RESOURCE_TYPES.PROJECT]: {
      primaryButtonText: __('Yes, delete project'),
      cancelButtonText: __('Cancel, keep project'),
      messageDeleteDelayed: s__(
        'Projects|This action will place this project, including all its resources, in a pending deletion state for %{delayedDeletionPeriodInDays} days, and delete it permanently on %{date}.',
      ),
      messageDeletePermanently: s__(
        'Projects|This project is scheduled for deletion on %{date}. This action will permanently delete this project, including all its resources, %{strongStart}immediately%{strongEnd}. This action cannot be undone.',
      ),
    },
    [RESOURCE_TYPES.GROUP]: {
      primaryButtonText: s__('Groups|Yes, delete group'),
      cancelButtonText: s__('Groups|Cancel, keep group'),
      messageDeleteDelayed: s__(
        'Groups|This action will place this group, including its subgroups and projects, in a pending deletion state for %{delayedDeletionPeriodInDays} days, and delete it permanently on %{date}.',
      ),
      messageDeletePermanently: s__(
        'Groups|This group is scheduled for deletion on %{date}. This action will permanently delete this group, including its subgroups and projects, %{strongStart}immediately%{strongEnd}. This action cannot be undone.',
      ),
    },
  },
  components: {
    GlModal,
    GlSprintf,
    PermanentDeletionConfirmCheckbox,
    SuperConfirmation,
  },
  model: {
    prop: 'visible',
    event: 'change',
  },
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
      validator: (value) => Object.values(RESOURCE_TYPES).includes(value),
    },
    confirmPhrase: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    confirmLoading: {
      type: Boolean,
      required: false,
      default: false,
    },
    markedForDeletion: {
      type: Boolean,
      required: true,
    },
    permanentDeletionDate: {
      type: String,
      required: true,
    },
  },
  emits: ['change', 'primary'],
  data() {
    return {
      checkboxChecked: false,
      modalId: uniqueId(`delete-modal-`),
    };
  },
  computed: {
    i18n() {
      return this.$options.resourceStrings[this.resourceType];
    },
    checkboxRequired() {
      const featureAvailable =
        window.gon?.saas_features?.groupProjectPermanentDeletionConfirmation ||
        window.gon?.dedicated_features?.groupProjectPermanentDeletionConfirmation;

      return featureAvailable && this.markedForDeletion;
    },
    checkboxValid() {
      return !this.checkboxRequired || this.checkboxChecked;
    },
    ariaLabel() {
      return sprintf(__('Delete %{name}'), {
        name: this.fullName,
      });
    },
    modalBodyMessage() {
      if (this.markedForDeletion) {
        return this.i18n.messageDeletePermanently;
      }

      return this.i18n.messageDeleteDelayed;
    },
    delayedDeletionPeriodInDays() {
      if (this.markedForDeletion) {
        return null;
      }

      return getDayDifference(getCurrentUtcDate(), newDate(this.permanentDeletionDate));
    },
  },
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
    handleModalChange(isVisible) {
      if (!isVisible) {
        this.checkboxChecked = false;
        this.$refs.superConfirmation?.reset();
      }

      this.$emit('change', isVisible);
    },
  },
};
</script>

<template>
  <gl-modal
    :visible="visible"
    :modal-id="modalId"
    :aria-label="ariaLabel"
    @change="handleModalChange"
  >
    <template #modal-title>{{ __('Are you absolutely sure?') }}</template>
    <div>
      <slot name="alert"></slot>
      <p data-testid="modal-body-message">
        <gl-sprintf :message="modalBodyMessage">
          <template #delayedDeletionPeriodInDays>{{ delayedDeletionPeriodInDays }}</template>
          <template #date>
            <span class="gl-font-bold">{{ permanentDeletionDate }}</span>
          </template>
          <template #strong="{ content }">
            <span class="gl-font-bold">{{ content }}</span>
          </template>
        </gl-sprintf>
      </p>
      <p>
        {{
          __(
            'This action can lead to data loss. To prevent accidental actions we ask you to confirm your intention.',
          )
        }}
      </p>
      <p class="gl-mb-3">
        {{ __('This affects:') }}
        <code class="gl-whitespace-pre-wrap">{{ confirmPhrase }}</code>
      </p>
      <permanent-deletion-confirm-checkbox
        v-if="checkboxRequired"
        v-model="checkboxChecked"
        :resource-type="resourceType"
      />
      <super-confirmation
        ref="superConfirmation"
        :target="confirmPhrase"
        :loading="confirmLoading"
        :ready="checkboxValid"
        :ready-hint="__('Tick the permanent deletion box above to unlock the slider')"
        @authorized="$emit('primary')"
        @exit="handleModalChange(false)"
      />
    </div>
  </gl-modal>
</template>
