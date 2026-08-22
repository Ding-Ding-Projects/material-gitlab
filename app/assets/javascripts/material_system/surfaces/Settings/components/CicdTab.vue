<template>
  <div id="st-tabpanel-cicd" role="tabpanel" aria-labelledby="st-tab-cicd" class="st-tab-panel">
    <SearchField
      :value="search"
      placeholder="Search variables and protected branches"
      label="Search CI/CD settings"
      :regex-mode="regexMode"
      :regex-open="regexOpen"
      :valid="matcher.valid"
      :error="matcher.error"
      :corpus="corpus"
      corpus-title="CI/CD settings"
      @input="search = $event"
      @toggle-regex="regexMode = !regexMode"
      @toggle-builder="regexOpen = !regexOpen"
      @apply-regex="onApplyRegex"
    />

    <div class="st-card">
      <div class="st-card__header">
        <div class="st-card__title">CI/CD variables</div>
        <button type="button" class="st-btn st-btn--filled st-btn--compact" @click="$emit('add-variable')">
          <StIcon name="add" size="small" />
          Add variable
        </button>
      </div>

      <SelectionToolbar
        v-if="variables.length > 0"
        :visible-count="filteredVariables.length"
        :selected-count="selectedVariableIds.length"
        item-noun="variables"
        @select-all="selectedVariableIds = filteredVariables.map((item) => item.id)"
        @clear="selectedVariableIds = []"
        @invert="invertVariableSelection"
      >
        <button type="button" class="st-btn st-btn--danger st-btn--compact" @click="confirmVariableRemoval(selectedVariableIds)">
          Delete selected
        </button>
      </SelectionToolbar>

      <div class="st-list">
        <VariableRow
          v-for="variable in filteredVariables"
          :key="variable.id"
          :variable="variable"
          :selected="selectedVariableIds.includes(variable.id)"
          @toggle-select="toggleVariableSelect"
          @toggle-reveal="$emit('toggle-reveal', $event)"
          @remove="confirmVariableRemoval([$event])"
        />
      </div>
      <p v-if="variables.length === 0" class="st-empty">No CI/CD variables yet.</p>
      <p v-else-if="filteredVariables.length === 0" class="st-empty">No variables match "{{ search }}".</p>
    </div>

    <div class="st-card">
      <div class="st-card__title">Protected branches</div>

      <SelectionToolbar
        v-if="protectedBranches.length > 0"
        :visible-count="filteredBranches.length"
        :selected-count="selectedBranchIds.length"
        item-noun="protected branches"
        @select-all="selectedBranchIds = filteredBranches.map((item) => item.id)"
        @clear="selectedBranchIds = []"
        @invert="invertBranchSelection"
      >
        <button type="button" class="st-btn st-btn--danger st-btn--compact" @click="confirmBranchUnprotect(selectedBranchIds)">
          Unprotect selected
        </button>
      </SelectionToolbar>

      <div class="st-list">
        <ProtectedBranchRow
          v-for="branch in filteredBranches"
          :key="branch.id"
          :branch="branch"
          :selected="selectedBranchIds.includes(branch.id)"
          @toggle-select="toggleBranchSelect"
          @unprotect="confirmBranchUnprotect([$event])"
        />
      </div>
      <p v-if="protectedBranches.length === 0" class="st-empty">No protected branches yet.</p>
      <p v-else-if="filteredBranches.length === 0" class="st-empty">No protected branches match "{{ search }}".</p>
    </div>

    <ConfirmDialog
      v-if="pendingAction"
      :title="pendingAction.title"
      :description="pendingAction.description"
      :items="pendingAction.items"
      :confirm-label="pendingAction.confirmLabel"
      @confirm="performPendingAction"
      @cancel="pendingAction = null"
    />
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import SearchField from './SearchField.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import VariableRow from './VariableRow.vue';
import ProtectedBranchRow from './ProtectedBranchRow.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { createMatcher } from '../data';

export default {
  name: 'CicdTab',
  components: { StIcon, SearchField, SelectionToolbar, VariableRow, ProtectedBranchRow, ConfirmDialog },
  props: {
    variables: { type: Array, required: true },
    protectedBranches: { type: Array, required: true },
  },
  data() {
    return {
      search: '',
      regexMode: false,
      regexOpen: false,
      selectedVariableIds: [],
      selectedBranchIds: [],
      pendingAction: null,
    };
  },
  computed: {
    matcher() {
      return createMatcher(this.search, { regexMode: this.regexMode });
    },
    corpus() {
      return [
        ...this.variables.map((variable) => variable.key),
        ...this.protectedBranches.map((branch) => branch.name),
      ];
    },
    filteredVariables() {
      return this.variables.filter((variable) => this.matcher.test(variable.key));
    },
    filteredBranches() {
      return this.protectedBranches.filter((branch) => this.matcher.test(branch.name));
    },
  },
  watch: {
    filteredVariables(list) {
      const visible = new Set(list.map((item) => item.id));
      this.selectedVariableIds = this.selectedVariableIds.filter((id) => visible.has(id));
    },
    filteredBranches(list) {
      const visible = new Set(list.map((item) => item.id));
      this.selectedBranchIds = this.selectedBranchIds.filter((id) => visible.has(id));
    },
  },
  methods: {
    onApplyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    toggleVariableSelect(id) {
      this.selectedVariableIds = this.selectedVariableIds.includes(id)
        ? this.selectedVariableIds.filter((entry) => entry !== id)
        : [...this.selectedVariableIds, id];
    },
    invertVariableSelection() {
      const selected = new Set(this.selectedVariableIds);
      this.selectedVariableIds = this.filteredVariables.filter((item) => !selected.has(item.id)).map((item) => item.id);
    },
    toggleBranchSelect(id) {
      this.selectedBranchIds = this.selectedBranchIds.includes(id)
        ? this.selectedBranchIds.filter((entry) => entry !== id)
        : [...this.selectedBranchIds, id];
    },
    invertBranchSelection() {
      const selected = new Set(this.selectedBranchIds);
      this.selectedBranchIds = this.filteredBranches.filter((item) => !selected.has(item.id)).map((item) => item.id);
    },
    confirmVariableRemoval(ids) {
      if (ids.length === 0) return;
      const names = this.variables.filter((item) => ids.includes(item.id)).map((item) => item.key);
      this.pendingAction = {
        type: 'variables',
        ids,
        title: 'Delete CI/CD variable?',
        description: 'Jobs that reference this variable will fail until it is re-added. This cannot be undone.',
        items: names,
        confirmLabel: 'Delete',
      };
    },
    confirmBranchUnprotect(ids) {
      if (ids.length === 0) return;
      const names = this.protectedBranches.filter((item) => ids.includes(item.id)).map((item) => item.name);
      this.pendingAction = {
        type: 'branches',
        ids,
        title: 'Unprotect branch?',
        description: 'Anyone with push access will be able to force-push or delete this branch.',
        items: names,
        confirmLabel: 'Unprotect',
      };
    },
    performPendingAction() {
      const action = this.pendingAction;
      this.pendingAction = null;
      if (!action) return;
      if (action.type === 'variables') {
        this.selectedVariableIds = this.selectedVariableIds.filter((id) => !action.ids.includes(id));
        this.$emit('remove-variables', action.ids);
      } else {
        this.selectedBranchIds = this.selectedBranchIds.filter((id) => !action.ids.includes(id));
        this.$emit('unprotect-branches', action.ids);
      }
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

.st-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.st-card__header .st-card__title {
  margin-right: auto;
}

.st-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
