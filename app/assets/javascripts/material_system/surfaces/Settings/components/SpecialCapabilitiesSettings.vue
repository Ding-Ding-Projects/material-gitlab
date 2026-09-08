<template>
  <section
    class="st-tab-panel"
    aria-label="Specialized project capabilities"
  >
    <div v-if="catalogAvailable" class="st-card" data-testid="material-ci-catalog-card">
      <div class="st-card__title">CI/CD Catalog project</div>
      <p class="st-card__desc">
        Make this component project discoverable in the CI/CD Catalog after it has a release.
      </p>
      <gl-alert v-if="catalogError" variant="danger" :dismissible="false">{{
        catalogError
      }}</gl-alert>
      <p v-if="catalogLoading" role="status" class="st-card__desc">Loading CI/CD Catalog status.</p>
      <template v-else>
        <p v-if="!catalog.description" class="st-card__warning" role="status">
          Add a project description before enabling the CI/CD Catalog.
        </p>
        <gl-form-checkbox
          :checked="catalog.enabled"
          :disabled="catalogBusy || !catalog.description"
          @change="onCatalogChange"
        >
          List this project in the CI/CD Catalog
        </gl-form-checkbox>
        <p class="st-card__desc">
          Removing it also removes released versions from the catalog. Re-enabling requires a new
          release.
        </p>
      </template>
    </div>

    <div v-if="secretsAvailable" class="st-card" data-testid="material-secrets-manager-card">
      <div class="st-card__title">Secrets Manager</div>
      <p class="st-card__desc">
        Provisioned secrets are managed by the existing server service. This page reads lifecycle
        metadata only and never requests secret values.
      </p>
      <gl-alert v-if="secretsError" variant="danger" :dismissible="false">{{
        secretsError
      }}</gl-alert>
      <p v-if="secretsLoading" role="status" class="st-card__desc">
        Loading Secrets Manager lifecycle status.
      </p>
      <template v-else>
        <p class="st-card__desc" data-testid="material-secrets-status">
          Status: {{ secrets.status }}
        </p>
        <p v-if="secrets.enrolled" class="st-card__desc">The namespace enrollment is active.</p>
        <p v-else-if="metadata.secrets_manager.enrollment_available" class="st-card__warning">
          The namespace must be enrolled before this project can be provisioned.
        </p>
        <p v-else-if="!secretsAllowed" class="st-card__warning">
          You can view the lifecycle status but cannot change this project setting.
        </p>
        <gl-button
          v-else-if="secrets.status === 'inactive'"
          variant="confirm"
          :loading="secretsBusy"
          @click="setSecrets(true)"
          >Provision Secrets Manager</gl-button
        >
        <gl-button
          v-else-if="secrets.status === 'active'"
          variant="danger"
          :loading="secretsBusy"
          @click="requestSecretsRemoval"
          >Deprovision Secrets Manager</gl-button
        >
        <p v-else class="st-card__desc" role="status">
          The lifecycle operation is in progress. Refresh to read its latest server status.
        </p>
      </template>
    </div>

    <div v-if="botAvailable" class="st-card" data-testid="material-bot-access-card">
      <div class="st-card__title">Pipeline execution policies</div>
      <p class="st-card__desc">
        Allow policy pipelines from the configured group hierarchy to read only matching CI/CD
        configuration files.
      </p>
      <gl-alert v-if="botError" variant="danger" :dismissible="false">{{ botError }}</gl-alert>
      <p v-if="!botAllowed" class="st-card__warning">
        Your current project access cannot change pipeline execution policy bot access.
      </p>
      <gl-form
        v-else
        :action="metadata.bot_access.action"
        method="post"
        @submit="validateBotSubmit"
      >
        <input type="hidden" name="authenticity_token" :value="csrfToken" />
        <input type="hidden" name="_method" value="patch" /><input type="hidden" name="material_settings_section" value="advanced" />
        <input type="hidden" name="update_section" value="js-shared-permissions" />
        <div v-if="metadata.bot_access.policy_access_available" class="st-subcard">
          <input
            v-if="!metadata.bot_access.policy_access_locked"
            type="hidden"
            name="project[project_setting_attributes][spp_repository_pipeline_access]"
            :value="bot.policyAccess"
          />
          <gl-form-checkbox
            v-model="bot.policyAccess"
            :disabled="metadata.bot_access.policy_access_locked"
            >Grant read-only access to security policy CI/CD configurations</gl-form-checkbox
          >
          <p v-if="metadata.bot_access.policy_access_locked" class="st-card__desc">
            This access setting is inherited and locked by the current project policy.
          </p>
        </div>
        <input
          type="hidden"
          name="project[project_setting_attributes][pipeline_execution_policy_bot_access_enabled]"
          :value="bot.enabled"
        />
        <gl-form-checkbox v-model="bot.enabled"
          >Allow access to CI/CD configuration files in this project</gl-form-checkbox
        >
        <gl-form-group
          v-if="bot.enabled"
          label="Allowed file patterns"
          label-for="st-bot-file-patterns"
          description="Comma-separated glob patterns, for example ci/**/*.yml."
        >
          <gl-form-input
            id="st-bot-file-patterns"
            v-model.trim="bot.patternText"
            autocomplete="off"
          />
          <input
            v-for="(pattern, index) in getBotPatterns()"
            :key="`pattern-${index}`"
            type="hidden"
            name="project[project_setting_attributes][pipeline_execution_policy_bot_access_file_patterns][]"
            :value="pattern"
          />
        </gl-form-group>
        <gl-form-group
          v-if="bot.enabled"
          label="Allowed group"
          label-for="st-bot-group-search"
          description="Search groups below the root ancestor. Leave the selection empty to use the root ancestor group."
        >
          <gl-form-input
            id="st-bot-group-search"
            v-model.trim="bot.groupQuery"
            autocomplete="off"
            @input="searchBotGroups"
          />
          <input
            type="hidden"
            name="project[project_setting_attributes][pipeline_execution_policy_bot_access_group_id]"
            :value="bot.groupId || ''"
          />
          <ul v-if="bot.groups.length" class="st-group-options" aria-label="Allowed groups">
            <li v-for="group in bot.groups" :key="group.id">
              <button
                type="button"
                class="st-group-option"
                :aria-pressed="bot.groupId === group.id"
                @click="selectBotGroup(group)"
              >
                {{ group.name }}<small>{{ group.fullPath }}</small>
              </button>
            </li>
          </ul>
          <p v-if="bot.groupId" class="st-card__desc">
            Selected group ID: {{ bot.groupId }}
            <gl-button category="tertiary" size="small" type="button" @click="clearBotGroup"
              >Use root ancestor group</gl-button
            >
          </p>
        </gl-form-group>
        <gl-button type="submit" variant="confirm">Save pipeline execution policy access</gl-button>
      </gl-form>
    </div>

    <div
      v-if="!catalogAvailable && !secretsAvailable && !botAvailable"
      class="st-card"
      data-testid="material-special-capabilities-empty"
    >
      <div class="st-card__title">Specialized capabilities</div>
      <p class="st-empty">
        No specialized project capabilities are available for your current project access and
        license.
      </p>
    </div>

    <ConfirmDialog
      v-if="pendingAction"
      :title="pendingAction.title"
      :description="pendingAction.description"
      :confirm-label="pendingAction.confirmLabel"
      @confirm="confirmPendingAction"
      @cancel="pendingAction = null"
    />
  </section>
</template>

<script>
import { GlAlert, GlButton, GlForm, GlFormCheckbox, GlFormGroup, GlFormInput } from '@gitlab/ui';
import csrf from '~/lib/utils/csrf';
import ConfirmDialog from './ConfirmDialog.vue';
import { createSpecialCapabilitiesAdapter } from '../special_capabilities_adapter';

const patternsText = (patterns) => (Array.isArray(patterns) ? patterns.join(', ') : '');
const splitPatterns = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const safeLocalAction = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !/[\u0000-\u0020\\]/.test(value);

export default {
  name: 'SpecialCapabilitiesSettings',
  components: {
    ConfirmDialog,
    GlAlert,
    GlButton,
    GlForm,
    GlFormCheckbox,
    GlFormGroup,
    GlFormInput,
  },
  props: { metadata: { type: Object, required: true } },
  data() {
    const bot = this.metadata.bot_access || {};
    return {
      adapter: null,
      catalog: { enabled: false, description: '' },
      secrets: { status: 'inactive', enrolled: false },
      bot: {
        enabled: Boolean(bot.enabled),
        patternText: patternsText(bot.file_patterns),
        groupId: bot.group_id || null,
        groupQuery: '',
        groups: [],
        policyAccess: Boolean(bot.policy_access_enabled),
      },
      catalogLoading: false,
      catalogBusy: false,
      catalogError: '',
      secretsLoading: false,
      secretsBusy: false,
      secretsError: '',
      botError: '',
      pendingAction: null,
    };
  },
  computed: {
    csrfToken() {
      return csrf.token;
    },
    catalogAvailable() {
      return this.metadata.ci_catalog?.available === true;
    },
    secretsAvailable() {
      return this.metadata.secrets_manager?.available === true;
    },
    secretsAllowed() {
      return this.secretsAvailable && this.metadata.secrets_manager?.allowed === true;
    },
    botAvailable() {
      return this.metadata.bot_access?.available === true;
    },
    botAllowed() {
      return (
        this.botAvailable &&
        this.metadata.bot_access?.allowed === true &&
        safeLocalAction(this.metadata.bot_access?.action)
      );
    },
  },
  mounted() {
    this.adapter = createSpecialCapabilitiesAdapter({ metadata: this.metadata });
    if (this.catalogAvailable) this.loadCatalog();
    if (this.secretsAvailable) this.loadSecrets();
  },
  methods: {
    async loadCatalog() {
      this.catalogLoading = true;
      this.catalogError = '';
      try {
        this.catalog = await this.adapter.loadCatalog();
      } catch (error) {
        this.catalogError = error.message;
      } finally {
        this.catalogLoading = false;
      }
    },
    async onCatalogChange(value) {
      if (!value && this.catalog.enabled) {
        this.pendingAction = {
          type: 'catalog',
          title: 'Remove from the CI/CD Catalog?',
          description:
            'The project and its released versions will be removed from the CI/CD Catalog. Re-enabling requires a new release.',
          confirmLabel: 'Remove from catalog',
        };
        return;
      }
      await this.setCatalog(Boolean(value));
    },
    async setCatalog(enabled) {
      if (!this.catalogAvailable || this.catalogBusy) return;
      this.catalogBusy = true;
      this.catalogError = '';
      try {
        await this.adapter.setCatalog(enabled);
        this.catalog = { ...this.catalog, enabled };
      } catch (error) {
        this.catalogError = error.message;
      } finally {
        this.catalogBusy = false;
      }
    },
    async loadSecrets() {
      this.secretsLoading = true;
      this.secretsError = '';
      try {
        this.secrets = await this.adapter.loadSecrets();
      } catch (error) {
        this.secretsError = error.message;
      } finally {
        this.secretsLoading = false;
      }
    },
    requestSecretsRemoval() {
      this.pendingAction = {
        type: 'secrets',
        title: 'Deprovision Secrets Manager?',
        description:
          'This removes the project Secrets Manager lifecycle service. Confirm that this project no longer needs it before continuing.',
        confirmLabel: 'Deprovision',
      };
    },
    async setSecrets(enabled) {
      if (!this.secretsAllowed || this.secretsBusy) return;
      this.secretsBusy = true;
      this.secretsError = '';
      try {
        this.secrets = { ...this.secrets, ...(await this.adapter.setSecrets(enabled)) };
      } catch (error) {
        this.secretsError = error.message;
      } finally {
        this.secretsBusy = false;
      }
    },
    getBotPatterns() {
      return splitPatterns(this.bot.patternText);
    },
    async searchBotGroups() {
      this.botError = '';
      try {
        this.bot.groups = await this.adapter.searchBotGroups(this.bot.groupQuery);
      } catch (error) {
        this.botError = error.message;
        this.bot.groups = [];
      }
    },
    selectBotGroup(group) {
      this.bot.groupId = group.id;
      this.bot.groupQuery = group.name;
      this.bot.groups = [];
    },
    clearBotGroup() {
      this.bot.groupId = null;
      this.bot.groupQuery = '';
      this.bot.groups = [];
    },
    validateBotSubmit(event) {
      this.botError = '';
      if (!this.botAllowed) { event.preventDefault(); return; }
      if (this.bot.enabled && this.getBotPatterns().length === 0) {
        this.botError = 'Add at least one allowed file pattern before saving.';
        event.preventDefault();
      }
    },
    confirmPendingAction() {
      const action = this.pendingAction;
      this.pendingAction = null;
      if (action?.type === 'catalog') return this.setCatalog(false);
      if (action?.type === 'secrets') return this.setSecrets(false);
      return undefined;
    },
  },
};
</script>

<style lang="scss" scoped>
.st-tab-panel,
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
.st-group-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.st-group-option {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 2px;
  border: 1px solid var(--st-outl);
  border-radius: var(--st-radius-field);
  background: transparent;
  color: var(--st-onsurf);
  cursor: pointer;
  padding: 8px 10px;
  text-align: left;
}
.st-group-option small {
  color: var(--st-onsurfv);
}
</style>
