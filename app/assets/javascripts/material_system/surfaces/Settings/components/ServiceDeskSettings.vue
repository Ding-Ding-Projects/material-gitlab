<script>
import {
  GlAlert,
  GlButton,
  GlForm,
  GlFormCheckbox,
  GlFormGroup,
  GlFormInput,
  GlFormSelect,
} from '@gitlab/ui';
import { createServiceDeskAdapter, normalizeServiceDesk } from '../service_desk_adapter';
import ConfirmDialog from './ConfirmDialog.vue';

const emptyCustomEmail = () => ({
  custom_email: '',
  smtp_address: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_password: '',
  smtp_authentication: null,
});

export default {
  name: 'ServiceDeskSettings',
  components: {
    ConfirmDialog,
    GlAlert,
    GlButton,
    GlForm,
    GlFormCheckbox,
    GlFormGroup,
    GlFormInput,
    GlFormSelect,
  },
  props: { metadata: { type: Object, required: true }, active: { type: Boolean, default: true } },
  watch: { active(value) { if (!value) this.clearCustomDraft(); } },
  data() {
    const state = normalizeServiceDesk(this.metadata);
    return {
      state,
      draft: { ...state },
      adapter: null,
      busy: false,
      error: '',
      notice: '',
      customBusy: false,
      custom: null,
      customDraft: emptyCustomEmail(),
      customError: '',
      resetConfirmationOpen: false,
    };
  },
  computed: {
    canManage() {
      return (
        this.metadata.supported !== false &&
        this.metadata.allowed === true &&
        Boolean(this.metadata.endpoint)
      );
    },
    canUseCustomEmail() {
      return (
        this.canManage &&
        this.state.enabled &&
        this.metadata.issueTrackerEnabled &&
        Boolean(this.metadata.customEmailEndpoint)
      );
    },
    customConfigured() {
      return Boolean(this.custom?.custom_email);
    },
    customOptions() {
      return [
        { text: 'No authentication', value: null },
        { text: 'Plain', value: 'plain' },
        { text: 'Login', value: 'login' },
        { text: 'CRAM-MD5', value: 'cram_md5' },
      ];
    },
    templateOptions() {
      const options = [{ text: 'No template', value: '' }];
      const groups = Array.isArray(this.metadata.templates) ? this.metadata.templates : [];
      for (let index = 0; index < groups.length; index += 2) {
        const entries = groups[index + 1];
        if (!Array.isArray(entries)) continue;
        entries.forEach((entry) =>
          options.push({
            text: `${groups[index]}: ${entry.name}`,
            value: JSON.stringify({ key: entry.key, projectId: entry.project_id }),
          }),
        );
      }
      return options;
    },
  },
  mounted() {
    if (!this.canManage) return;
    this.adapter = createServiceDeskAdapter(this.metadata);
    this.refresh();
  },
  methods: {
    apply(next) {
      this.state = { ...this.state, ...next };
      this.draft = { ...this.state };
    },
    async refresh() {
      if (!this.canManage) return;
      try {
        this.apply(await this.adapter.load());
      } catch (error) {
        this.error = error.message;
      }
    },
    async save() {
      if (!this.canManage || this.busy) return;
      this.busy = true;
      this.error = '';
      this.notice = '';
      try {
        this.apply(
          await this.adapter.save({
            service_desk_enabled: this.draft.enabled,
            issue_template_key: this.draft.issueTemplateKey,
            file_template_project_id: this.draft.fileTemplateProjectId,
            outgoing_name: this.draft.outgoingName,
            project_key: this.draft.projectKey,
            tickets_confidential_by_default: this.metadata.publicProject
              ? true
              : this.draft.ticketsConfidentialByDefault,
            reopen_issue_on_external_participant_note:
              this.draft.reopenIssueOnExternalParticipantNote,
            add_external_participants_from_cc: this.draft.addExternalParticipantsFromCc,
          }),
        );
        this.notice = 'Service Desk settings saved.';
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    async loadCustomEmail() {
      if (!this.canUseCustomEmail) return;
      this.customBusy = true;
      this.customError = '';
      try {
        this.custom = await this.adapter.loadCustomEmail();
      } catch (error) {
        this.customError = error.message;
      } finally {
        this.customBusy = false;
      }
    },
    async saveCustomEmail() {
      if (!this.canUseCustomEmail || this.customBusy) return;
      this.customBusy = true;
      this.customError = '';
      try {
        this.custom = await this.adapter.saveCustomEmail(this.customDraft);
      } catch (error) {
        this.customError = error.message;
      } finally {
        this.customDraft = emptyCustomEmail();
        this.customBusy = false;
      }
    },
    clearCustomDraft() {
      this.customDraft = emptyCustomEmail();
    },
    selectTemplate(value) {
      if (!value) {
        this.draft.issueTemplateKey = '';
        this.draft.fileTemplateProjectId = null;
        return;
      }
      const selected = JSON.parse(value);
      this.draft.issueTemplateKey = selected.key;
      this.draft.fileTemplateProjectId = selected.projectId;
    },
    async toggleCustomEmail(enabled) {
      if (!this.canUseCustomEmail || this.customBusy) return;
      this.customBusy = true;
      this.customError = '';
      try {
        this.custom = await this.adapter.toggleCustomEmail(enabled);
      } catch (error) {
        this.customError = error.message;
      } finally {
        this.customBusy = false;
      }
    },
    requestResetCustomEmail() {
      if (this.canUseCustomEmail && !this.customBusy) this.resetConfirmationOpen = true;
    },
    cancelResetCustomEmail() {
      this.resetConfirmationOpen = false;
    },
    async resetCustomEmail() {
      this.resetConfirmationOpen = false;
      if (!this.canUseCustomEmail || this.customBusy) return;
      this.customBusy = true;
      this.customError = '';
      try {
        this.custom = await this.adapter.resetCustomEmail();
      } catch (error) {
        this.customError = error.message;
      } finally {
        this.customBusy = false;
      }
    },
  },
};
</script>

<template>
  <section
    v-if="metadata.supported !== false"
    class="st-tab-panel"
    aria-labelledby="service-desk-title"
  >
    <div class="st-card">
      <h2 id="service-desk-title" class="st-card__title">Service Desk</h2>
      <p class="st-card__desc">
        Create support tickets from email. The server validates every saved setting.
      </p>
    </div>
    <gl-alert v-if="error" variant="danger" @dismiss="error = ''">{{ error }}</gl-alert
    ><gl-alert v-if="notice" variant="success" @dismiss="notice = ''">{{ notice }}</gl-alert>
    <div v-if="!canManage" class="st-card">
      <p class="st-card__warning">You do not have permission to manage Service Desk settings.</p>
    </div>
    <gl-form v-else class="st-card" @submit.prevent="save"
      ><gl-form-checkbox v-model="draft.enabled" :disabled="busy || !metadata.issueTrackerEnabled"
        >Enable Service Desk</gl-form-checkbox
      >
      <p v-if="!metadata.issueTrackerEnabled" class="st-card__warning">
        Enable Issues before enabling Service Desk.
      </p>
      <template v-if="draft.enabled"
        ><gl-form-group label="Incoming email" label-for="st-sd-incoming"
          ><gl-form-input
            id="st-sd-incoming" :value="state.incomingEmail || metadata.serviceDeskEmail"
            disabled /></gl-form-group
        ><gl-form-group label="Issue template and project source" label-for="st-sd-template"
          ><gl-form-select
            :value="
              draft.issueTemplateKey
                ? JSON.stringify({
                    key: draft.issueTemplateKey,
                    projectId: draft.fileTemplateProjectId,
                  })
                : ''
            "
            id="st-sd-template" :options="templateOptions"
            :disabled="busy"
            @input="selectTemplate" /></gl-form-group
        ><gl-form-group label="Email display name" label-for="st-sd-display-name"
          ><gl-form-input id="st-sd-display-name" v-model.trim="draft.outgoingName" :disabled="busy" /></gl-form-group
        ><gl-form-group label="Email address suffix" label-for="st-sd-project-key"
          ><gl-form-input
            id="st-sd-project-key" v-model.trim="draft.projectKey"
            :disabled="busy || !metadata.serviceDeskEmailEnabled"
            pattern="[a-z0-9_]*" /></gl-form-group
        ><gl-form-checkbox
          v-model="draft.ticketsConfidentialByDefault"
          :disabled="busy || metadata.publicProject"
          >New tickets are confidential by default</gl-form-checkbox
        ><gl-form-checkbox v-model="draft.reopenIssueOnExternalParticipantNote" :disabled="busy"
          >Reopen issues when an external participant comments</gl-form-checkbox
        ><gl-form-checkbox v-model="draft.addExternalParticipantsFromCc" :disabled="busy"
          >Add external participants from the Cc header</gl-form-checkbox
        ></template
      ><gl-button
        type="submit"
        variant="confirm"
        :loading="busy"
        :disabled="busy || !metadata.issueTrackerEnabled"
        >Save changes</gl-button
      ></gl-form
    >
    <div v-if="canUseCustomEmail" class="st-card">
      <h2 class="st-card__title">Custom email</h2>
      <gl-alert v-if="customError" variant="danger" @dismiss="customError = ''">{{
        customError
      }}</gl-alert
      ><gl-button v-if="!custom" :loading="customBusy" @click="loadCustomEmail"
        >Load custom email status</gl-button
      ><template v-else-if="customConfigured"
        ><p class="st-card__desc">
          {{ custom.custom_email }}. Verification:
          {{ custom.custom_email_verification_state || 'not started' }}.
        </p>
        <p v-if="custom.custom_email_verification_error" class="st-card__warning">
          {{ custom.custom_email_verification_error }}
        </p>
        <gl-form-checkbox
          :checked="custom.custom_email_enabled"
          :disabled="customBusy"
          @change="toggleCustomEmail"
          >Use this custom email</gl-form-checkbox
        ><gl-button category="secondary" :disabled="customBusy" @click="requestResetCustomEmail"
          >Remove custom email</gl-button
        ></template
      ><gl-form v-else @submit.prevent="saveCustomEmail"
        ><p class="st-card__desc">
          SMTP passwords are write-only and are never loaded back into this page.
        </p>
        <gl-form-group label="Custom email" label-for="st-sd-custom-email"
          ><gl-form-input
            id="st-sd-custom-email" v-model.trim="customDraft.custom_email"
            type="email"
            required
            :disabled="customBusy" /></gl-form-group
        ><gl-form-group label="SMTP address" label-for="st-sd-smtp-address"
          ><gl-form-input
            id="st-sd-smtp-address" v-model.trim="customDraft.smtp_address"
            required
            :disabled="customBusy" /></gl-form-group
        ><gl-form-group label="SMTP port" label-for="st-sd-smtp-port"
          ><gl-form-input
            id="st-sd-smtp-port" v-model.trim="customDraft.smtp_port"
            type="number"
            required
            :disabled="customBusy" /></gl-form-group
        ><gl-form-group label="SMTP username" label-for="st-sd-smtp-username"
          ><gl-form-input
            id="st-sd-smtp-username" v-model.trim="customDraft.smtp_username"
            required
            :disabled="customBusy" /></gl-form-group
        ><gl-form-group label="SMTP password" label-for="st-sd-smtp-password"
          ><gl-form-input
            id="st-sd-smtp-password" v-model="customDraft.smtp_password"
            type="password" autocomplete="new-password"
            required
            :disabled="customBusy" /></gl-form-group
        ><gl-form-group label="SMTP authentication" label-for="st-sd-smtp-auth"
          ><gl-form-select
            id="st-sd-smtp-auth" v-model="customDraft.smtp_authentication"
            :options="customOptions"
            :disabled="customBusy" /></gl-form-group
        ><gl-button type="submit" variant="confirm" :loading="customBusy"
          >Save and verify custom email</gl-button
        ><gl-button category="secondary" :disabled="customBusy" @click="clearCustomDraft"
          >Clear custom email form</gl-button
        ></gl-form
      >
    </div>
    <confirm-dialog
      v-if="resetConfirmationOpen"
      title="Remove custom email?"
      description="This removes the custom email address and its stored credentials. You must configure and verify it again before using it."
      confirm-label="Remove custom email"
      @cancel="cancelResetCustomEmail"
      @confirm="resetCustomEmail"
    />
  </section>
</template>

<style lang="scss" scoped>
.st-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.st-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.st-card__title {
  margin: 0;
  font-size: 18px;
}
.st-card__desc,
.st-card__warning {
  margin: 0;
  color: var(--st-onsurfv);
  font-size: 13.5px;
  line-height: 1.45;
}
.st-card__warning {
  color: var(--st-err);
}
.gl-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
</style>
