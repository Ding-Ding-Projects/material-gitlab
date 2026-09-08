<template>
  <gl-form v-if="canSubmit" class="st-card" :action="metadata.action" method="post" @submit="validateSubmit">
    <h2 class="st-card__title">Project features and permissions</h2>
    <input type="hidden" name="authenticity_token" :value="csrfToken" />
    <input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" />
    <input type="hidden" name="update_section" value="js-shared-permissions" />
    <gl-form-group v-for="field in metadata.fields" :key="field.key" :label="field.kind === 'access' ? field.label : ''" :label-for="`st-feature-${field.key}`">
      <input v-if="!field.disabled && !(field.key === 'cveIdRequestEnabled' && visibilityLevel !== 20)" type="hidden" :name="field.name" :value="draft[field.key]" />
      <gl-form-select v-if="field.kind === 'access'" :id="`st-feature-${field.key}`" :value="draft[field.key]" :options="optionsFor(field)" :disabled="disabled(field)" @input="setField(field, $event)" />
      <gl-form-checkbox v-else :id="`st-feature-${field.key}`" :checked="draft[field.key]" :disabled="disabled(field)" @change="setField(field, $event)">{{ field.label }}</gl-form-checkbox>
    </gl-form-group>
    <p v-if="draft.lfsEnabled === false && metadata.lfsObjectsExist">Existing large-file objects can remain available to forks. <gl-link :href="metadata.lfsObjectsRemovalHelpPath">Learn how to remove them</gl-link></p>
    <p v-if="error" role="alert">{{ error }}</p>
    <gl-button type="submit" variant="confirm">Save feature permissions</gl-button>
  </gl-form>
</template>

<script>
import { GlButton, GlForm, GlFormGroup, GlFormSelect, GlFormCheckbox, GlLink } from '@gitlab/ui';
import csrf from '~/lib/utils/csrf';

const safeAction = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\u0000-\u0020\\]/.test(value);
const accessOptions = [
  { value: 0, text: 'Disabled' }, { value: 10, text: 'Project members' },
  { value: 20, text: 'Everyone with access' }, { value: 30, text: 'Anyone, including unauthenticated users' },
];

export default {
  name: 'ProjectPermissionsCard',
  components: { GlButton, GlForm, GlFormGroup, GlFormSelect, GlFormCheckbox, GlLink },
  props: { metadata: { type: Object, default: () => ({}) }, visibility: { type: String, default: '' } },
  data() { return { draft: Object.fromEntries((this.metadata.fields || []).map((field) => [field.key, field.value])), error: '' }; },
  computed: {
    csrfToken() { return csrf.token; },
    visibilityLevel() { return { Private: 0, Internal: 10, Public: 20 }[this.visibility] ?? this.metadata.visibilityLevel; },
    canSubmit() { return this.metadata.allowed === true && safeAction(this.metadata.action) && Array.isArray(this.metadata.fields); },
  },
  methods: {
    disabled(field) {
      return field.disabled === true || (field.repositoryDependent && this.draft.repositoryAccessLevel === 0)
        || (field.key === 'cveIdRequestEnabled' && this.visibilityLevel !== 20)
        || (field.key === 'lfsEnabled' && this.draft.repositoryAccessLevel === 0)
        || (field.key === 'showDiffPreviewInEmail' && this.draft.emailsEnabled === false);
    },
    optionsFor(field) {
      let values = [0, 10, 20];
      if (field.key === 'pagesAccessLevel') {
        values = this.visibilityLevel === 0 ? [0, 10] : [0, 10, 20];
        if (this.visibilityLevel !== 20 && !this.metadata.pagesAccessControlForced) values.push(30);
      } else if (field.key === 'packageRegistryAccessLevel') {
        values = this.visibilityLevel === 0 ? [0, 10] : [0, 20];
        if (this.metadata.packageRegistryAllowAnyoneToPull === true && this.visibilityLevel !== 20) values.push(30);
      } else if (field.repositoryDependent && field.key !== 'forkingAccessLevel') {
        values = values.filter((value) => value <= this.draft.repositoryAccessLevel);
      }
      const current = this.draft[field.key];
      return accessOptions.filter((option) => values.includes(option.value) || option.value === current)
        .map((option) => ({ ...option, disabled: !values.includes(option.value) }));
    },
    setField(field, value) {
      if (!this.canSubmit || this.disabled(field)) return;
      const next = field.kind === 'access' ? Number(value) : Boolean(value);
      if (field.kind === 'access' && !this.optionsFor(field).some((option) => option.value === next && !option.disabled)) return;
      this.$set(this.draft, field.key, next);
      if (field.key === 'repositoryAccessLevel') {
        for (const key of ['mergeRequestsAccessLevel', 'buildsAccessLevel']) {
          if (this.draft[key] !== undefined && this.draft[key] > next) this.$set(this.draft, key, next);
        }
      }
      if (field.key === 'emailsEnabled' && next === false && this.draft.showDiffPreviewInEmail !== undefined) this.draft.showDiffPreviewInEmail = false;
    },
    validateSubmit(event) {
      if (!this.canSubmit) { event.preventDefault(); return; }
      const invalid = this.metadata.fields.some((field) => field.kind === 'access' && !this.optionsFor(field).some((option) => option.value === this.draft[field.key]));
      if (invalid) { this.error = 'A feature permission is invalid. Reload the current project settings.'; event.preventDefault(); }
    },
  },
};
</script>
