<template>
  <section class="st-tab-panel" aria-labelledby="duo-context-title">
    <div class="st-card">
      <h2 id="duo-context-title" class="st-card__title">GitLab Duo context</h2>
      <p class="st-card__desc">
        Manage the file paths excluded from GitLab Duo context.
      </p>
    </div>
    <div v-if="!canManage" class="st-card">
      <p class="st-card__warning">
        Duo context settings are unavailable for your current project access.
      </p>
    </div>
    <gl-form
      v-else
      class="st-card"
      :action="metadata.action"
      method="post"
      @submit="validateSubmit"
    >
      <input type="hidden" name="authenticity_token" :value="csrfToken" /><input
        type="hidden"
        name="_method"
        value="patch"
      /><input type="hidden" name="material_settings_section" value="advanced" /><input type="hidden" name="update_section" value="js-shared-permissions" />
      <gl-form-group label="Add exclusion rule" label-for="st-duo-rule"
        ><gl-form-input id="st-duo-rule" v-model.trim="newRule" autocomplete="off" /><gl-button
          type="button"
          :disabled="!newRule"
          @click="addRule"
          >Add rule</gl-button
        ></gl-form-group
      >
      <ul v-if="rules.length" class="st-rules">
        <li v-for="(rule, index) in rules" :key="rule">
          <span>{{ rule }}</span
          ><gl-button type="button" category="tertiary" variant="danger" @click="removeRule(index)"
            >Remove</gl-button
          ><input
            type="hidden"
            name="project[project_setting_attributes][duo_context_exclusion_settings][exclusion_rules][]"
            :value="rule"
          />
        </li>
      </ul>
      <p v-else class="st-card__desc">No exclusion rules are defined.</p>
      <input
        v-if="rules.length === 0"
        type="hidden"
        name="project[project_setting_attributes][duo_context_exclusion_settings][exclusion_rules]"
        :value="null"
      />
      <p v-if="error" class="st-card__warning" role="alert">{{ error }}</p>
      <gl-button type="submit" variant="confirm">Save context exclusions</gl-button>
    </gl-form>
    <div
      v-if="metadata.duo_readiness_available"
      class="st-card"
      data-testid="material-duo-readiness"
    >
      <h2 class="st-card__title">Duo readiness</h2>
      <p class="st-card__desc">
        Agent platform: {{ readiness.platformEnabled ? 'ready' : 'not available' }}. Project Duo:
        {{ metadata.duo_features_enabled ? 'enabled' : 'disabled' }}. Flow execution:
        {{ metadata.remote_flows_enabled ? 'enabled' : 'disabled' }}.
      </p>
      <gl-link v-if="readiness.groupSettingsPath" :href="readiness.groupSettingsPath"
        >Open group setup</gl-link
      ><gl-link v-if="readiness.adminSettingsPath" :href="readiness.adminSettingsPath"
        >Open instance setup</gl-link
      ><gl-link v-if="readiness.runnersPath" :href="runnersPath">Open runners</gl-link>
      <p role="status">Runner: {{ readiness.runnerAvailable === true ? 'available' : 'not available' }}</p>
      <gl-button :disabled="checkingRunner" @click="checkRunner">{{ checkingRunner ? 'Checking runner…' : 'Check runner again' }}</gl-button>
      <p v-if="runnerError" role="alert">{{ runnerError }}</p>
      <gl-link v-for="link in metadata.local_setup || []" :key="link.path" :href="link.path">{{ link.label }}</gl-link>
    </div>
    <div v-if="metadata.governance_path" class="st-card">
      <h2 class="st-card__title">Duo governance</h2>
      <p class="st-card__desc">
        Manage centralized AI tool rules in the dedicated governance editor.
      </p>
      <gl-link :href="metadata.governance_path">Open governance</gl-link>
    </div>
  </section>
</template>

<script>
import { GlButton, GlForm, GlFormGroup, GlFormInput, GlLink } from '@gitlab/ui';
import csrf from '~/lib/utils/csrf';
import { checkDuoRunner } from '../duo_readiness_adapter';
const safePath = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !/[\u0000-\u0020\\]/.test(value);
export default {
  name: 'DuoContextSettings',
  components: { GlButton, GlForm, GlFormGroup, GlFormInput, GlLink },
  props: { metadata: { type: Object, required: true } },
  data() {
    return { rules: [...(this.metadata.exclusion_rules || [])], newRule: '', error: '', runnerState: {}, checkingRunner: false, runnerError: '' };
  },
  computed: {
    csrfToken() {
      return csrf.token;
    },
    readiness() {
      return { ...(this.metadata.duo_readiness || {}), ...this.runnerState };
    },
    runnersPath() {
      const url = new URL(this.readiness.runnersPath, window.location.origin);
      url.searchParams.set('tab', { instance_type: 'instance', group_type: 'group', project_type: 'assigned' }[this.readiness.usableRunnerType] || 'instance');
      return `${url.pathname}${url.search}${url.hash}`;
    },
    canManage() {
      return this.metadata.allowed === true && safePath(this.metadata.action);
    },
  },
  methods: {
    async checkRunner() {
      if (this.checkingRunner || this.metadata.duo_readiness_available !== true) return;
      this.checkingRunner = true;
      this.runnerError = '';
      try { this.runnerState = await checkDuoRunner({ fullPath: this.metadata.project_full_path, endpoint: this.metadata.graphql_endpoint }); }
      catch (error) { this.runnerError = error.message; }
      finally { this.checkingRunner = false; }
    },
    addRule() {
      const rule = this.newRule.trim();
      if (!rule || this.rules.includes(rule)) return;
      this.rules.push(rule);
      this.newRule = '';
    },
    removeRule(index) {
      this.rules.splice(index, 1);
    },
    validateSubmit(event) {
      if (!this.canManage) event.preventDefault();
    },
  },
};
</script>

<style lang="scss" scoped>
.st-tab-panel,
.st-card,
.st-rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.st-card__title,
.st-card__desc,
.st-card__warning {
  margin: 0;
}
.st-card__title {
  font-size: 18px;
}
.st-card__desc {
  color: var(--st-onsurfv);
}
.st-card__warning {
  color: var(--st-err);
}
.st-rules {
  list-style: none;
  padding: 0;
}
.st-rules li {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}
</style>
