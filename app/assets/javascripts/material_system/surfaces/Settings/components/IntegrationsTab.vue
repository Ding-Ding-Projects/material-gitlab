<template>
  <div id="st-tabpanel-integrations" role="tabpanel" aria-labelledby="st-tab-integrations" class="st-tab-panel">
    <SearchField
      :value="search"
      placeholder="Search integrations"
      label="Search integrations"
      :regex-mode="regexMode"
      :regex-open="regexOpen"
      :valid="matcher.valid"
      :error="matcher.error"
      :corpus="integrations.map((integration) => `${integration.name} ${integration.desc}`)"
      corpus-title="Integrations"
      @input="search = $event"
      @toggle-regex="regexMode = !regexMode"
      @toggle-builder="regexOpen = !regexOpen"
      @apply-regex="onApplyRegex"
    />

    <div class="st-card st-card--flush">
      <SelectionToolbar
        v-if="integrations.length > 0"
        :visible-count="filtered.length"
        :selected-count="selectedIds.length"
        item-noun="integrations"
        @select-all="selectedIds = filtered.map((item) => item.id)"
        @clear="selectedIds = []"
        @invert="invertSelection"
      >
        <button type="button" class="st-btn st-btn--text st-btn--compact" @click="$emit('bulk-toggle', { ids: selectedIds, on: true })">
          Enable selected
        </button>
        <button type="button" class="st-btn st-btn--text st-btn--compact" @click="$emit('bulk-toggle', { ids: selectedIds, on: false })">
          Disable selected
        </button>
      </SelectionToolbar>

      <IntegrationRow
        v-for="integration in filtered"
        :key="integration.id"
        :integration="integration"
        :selected="selectedIds.includes(integration.id)"
        @toggle-select="toggleSelect"
        @toggle="$emit('toggle', $event)"
      />

      <p v-if="integrations.length === 0" class="st-empty">No integrations configured yet.</p>
      <p v-else-if="filtered.length === 0" class="st-empty">No integrations match "{{ search }}".</p>
    </div>
  </div>
</template>

<script>
import SearchField from './SearchField.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import IntegrationRow from './IntegrationRow.vue';
import { createMatcher } from '../data';

export default {
  name: 'IntegrationsTab',
  components: { SearchField, SelectionToolbar, IntegrationRow },
  props: {
    integrations: { type: Array, required: true },
  },
  data() {
    return { search: '', regexMode: false, regexOpen: false, selectedIds: [] };
  },
  computed: {
    matcher() {
      return createMatcher(this.search, { regexMode: this.regexMode });
    },
    filtered() {
      return this.integrations.filter((integration) => this.matcher.test(`${integration.name} ${integration.desc}`));
    },
  },
  watch: {
    filtered(list) {
      const visible = new Set(list.map((item) => item.id));
      this.selectedIds = this.selectedIds.filter((id) => visible.has(id));
    },
  },
  methods: {
    onApplyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    toggleSelect(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((entry) => entry !== id)
        : [...this.selectedIds, id];
    },
    invertSelection() {
      const selected = new Set(this.selectedIds);
      this.selectedIds = this.filtered.filter((item) => !selected.has(item.id)).map((item) => item.id);
    },
  },
};
</script>

<style lang="scss" scoped>
.st-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.st-card--flush {
  padding: 0;
  gap: 0;
  overflow: hidden;
}
</style>
