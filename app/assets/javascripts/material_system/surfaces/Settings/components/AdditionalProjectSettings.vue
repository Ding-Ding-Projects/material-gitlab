<template>
  <section class="st-tab-panel" data-screen-label="Additional project settings">
    <div v-if="canDuo" class="st-card" data-testid="material-duo-settings">
      <div class="st-card__title">GitLab Duo</div>
      <p class="st-card__desc">Configure the available AI features for this project. A locked setting is controlled by an ancestor or the instance.</p>
      <gl-form :action="actionFor('duo')" method="post">
        <input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" /><input :value="csrfToken" type="hidden" name="authenticity_token" />
        <div v-for="field in duoFields" :key="field.name" class="st-setting-row"><input v-if="!fieldDisabled(field)" type="hidden" :name="field.name" value="0" /><template v-if="field.requires_remediation_profile"><gl-form-checkbox :checked="field.value" :name="field.name" :disabled="fieldDisabled(field) || remediationField === field" @change="onDependencyBumpChange(field, $event)"><span>{{ field.label }}</span></gl-form-checkbox><button v-if="!field.value" type="button" class="st-btn st-btn--text" :disabled="fieldDisabled(field) || remediationLoading" @click="openRemediation(field)">Attach required remediation profile</button></template><gl-form-checkbox v-else v-model="field.value" :name="field.name" :disabled="fieldDisabled(field)">{{ field.label }} <span v-if="fieldDisabled(field)" class="st-lock">{{ field.locked ? 'Locked by policy' : 'Requires GitLab Duo' }}</span></gl-form-checkbox></div>
        <gl-button type="submit" :disabled="duoFields.length === 0">Save Duo settings</gl-button>
      </gl-form>
    </div>
    <div v-if="canTemplate" class="st-card" data-testid="material-default-template-settings"><div class="st-card__title">Default description for work items</div><gl-form :action="actionFor('default_work_item_template')" method="post"><input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" /><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-form-group label="Default description for work items" label-for="st-default-work-item-template"><gl-form-textarea id="st-default-work-item-template" v-model="templateValue" name="project[issues_template]" rows="3" /></gl-form-group><gl-button type="submit">Save changes</gl-button></gl-form></div>
    <div v-if="canExternalAuthorization" class="st-card" data-testid="material-external-authorization-settings"><div class="st-card__title">External authorization classification</div><p class="st-card__desc">When blank, the instance default classification label is used: {{ metadata.external_authorization.default_label || 'none configured' }}.</p><gl-form :action="actionFor('external_authorization')" method="post"><input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" /><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-form-group label="Classification label (optional)" label-for="st-external-classification"><gl-form-input id="st-external-classification" v-model="classificationValue" name="project[external_authorization_classification_label]" /></gl-form-group><gl-button type="submit">Save classification</gl-button></gl-form></div>
    <div v-if="canRepositorySize" class="st-card" data-testid="material-repository-size-settings"><div class="st-card__title">Repository size limit</div><p class="st-card__desc">Set the maximum repository size in MiB. Enter 0 for no limit.</p><gl-form :action="actionFor('repository_size_limit')" method="post"><input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" /><input :value="csrfToken" type="hidden" name="authenticity_token" /><gl-form-group label="Repository size limit (MiB)" label-for="st-repository-size-limit"><gl-form-input id="st-repository-size-limit" v-model="repositorySizeValue" name="project[repository_size_limit]" type="number" min="0" /></gl-form-group><gl-button type="submit">Save repository size limit</gl-button></gl-form></div>
    <DuoRemediationDialog v-if="remediationField" :loading="remediationLoading" :error="remediationError" @attach="attachRemediationProfile" @cancel="closeRemediation" />
  </section>
</template>

<script>
import { GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput, GlFormTextarea } from '@gitlab/ui';
import csrf from '~/lib/utils/csrf';
import DuoRemediationDialog from './DuoRemediationDialog.vue';
import { ensureDependencyBumpProfile } from '../duo_remediation_adapter';

const safeLocalAction = (action) => typeof action === 'string' && action.startsWith('/') && !action.startsWith('//') && !/[\u0000-\u0020\\]/.test(action);

export default {
  name: 'AdditionalProjectSettings',
  components: { GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput, GlFormTextarea, DuoRemediationDialog },
  props: { metadata: { type: Object, default: () => ({}) } },
  data() { return { duoFields: (this.metadata.duo?.fields || []).map((field) => ({ ...field })), templateValue: this.metadata.default_work_item_template?.value || '', classificationValue: this.metadata.external_authorization?.value || '', repositorySizeValue: this.metadata.repository_size_limit?.value ?? '', remediationField: null, remediationLoading: false, remediationError: '' }; },
  computed: {
    csrfToken() { return csrf.token; },
    canDuo() { return this.actionAllowed('duo') && this.duoFields.length > 0; },
    canTemplate() { return this.actionAllowed('default_work_item_template'); },
    canExternalAuthorization() { return this.actionAllowed('external_authorization'); },
    canRepositorySize() { return this.actionAllowed('repository_size_limit'); },
  },
  watch: { metadata: { deep: true, handler() { this.duoFields = (this.metadata.duo?.fields || []).map((field) => ({ ...field })); this.templateValue = this.metadata.default_work_item_template?.value || ''; this.classificationValue = this.metadata.external_authorization?.value || ''; this.repositorySizeValue = this.metadata.repository_size_limit?.value ?? ''; } } },
  methods: {
    actionAllowed(key) { const entry = this.metadata?.[key]; return entry?.allowed === true && safeLocalAction(entry.action); },
    actionFor(key) { return this.actionAllowed(key) ? this.metadata[key].action : ''; },
    duoValue(key) { const field = this.duoFields.find((item) => item.key === key); return field ? field.value === true : this.metadata.duo?.inherited_values?.[key] === true; },
    fieldDisabled(field) {
      if (field.locked) return true;
      const duoEnabled = this.duoValue('duo_features_enabled');
      if (['duo_remote_flows_enabled', 'tool_approval_for_session_enabled', 'dap_session_tracking_enabled', 'amazon_q_auto_review_enabled', 'duo_sast_vr_workflow_enabled', 'duo_sast_fp_detection_enabled', 'duo_secret_detection_fp_enabled', 'duo_dependency_bump_breaking_changes_enabled'].includes(field.key)) return !duoEnabled;
      if (field.key === 'duo_foundational_flows_enabled') return !duoEnabled || !this.duoValue('duo_remote_flows_enabled');
      return false;
    },
    onDependencyBumpChange(field, enabled) { if (!this.actionAllowed('duo') || this.fieldDisabled(field)) return; if (enabled === false) field.value = false; else if (enabled === true) this.openRemediation(field); },
    openRemediation(field) { this.remediationField = field; this.remediationError = ''; },
    closeRemediation() { if (!this.remediationLoading) { this.remediationField = null; this.remediationError = ''; } },
    async attachRemediationProfile() {
      const field = this.remediationField;
      if (!field || !this.actionAllowed('duo') || this.fieldDisabled(field)) return;
      this.remediationLoading = true;
      this.remediationError = '';
      try {
        await ensureDependencyBumpProfile({ projectFullPath: field.project_full_path, projectGlobalId: field.project_global_id, allowed: this.actionAllowed('duo') && !this.fieldDisabled(field) });
        if (!this.actionAllowed('duo') || this.fieldDisabled(field) || !this.duoFields.includes(field)) return;
        field.value = true;
        this.remediationField = null;
      } catch (error) {
        this.remediationError = error?.message || 'The required remediation profile could not be attached.';
      } finally { this.remediationLoading = false; }
    },
  },
};
</script>

<style lang="scss" scoped>
.st-tab-panel { display: flex; flex-direction: column; gap: 14px; }
.st-card__desc { margin: 0; color: var(--st-onsurfv); font-size: 13.5px; line-height: 1.45; }
.gl-form { display: flex; flex-direction: column; gap: 12px; }
.st-setting-row { padding: 8px 0; border-bottom: 1px solid var(--st-outlv); }
.st-lock { color: var(--st-onsurfv); font-size: 12px; }
</style>
