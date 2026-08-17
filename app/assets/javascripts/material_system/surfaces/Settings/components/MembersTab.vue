<template>
  <div id="st-tabpanel-members" role="tabpanel" aria-labelledby="st-tab-members" class="st-tab-panel">
    <SearchField
      :value="search"
      placeholder="Search members by name, handle, or role"
      label="Search members"
      :regex-mode="regexMode"
      :regex-open="regexOpen"
      :valid="matcher.valid"
      :error="matcher.error"
      :corpus="members.map((member) => `${member.name} @${member.handle} ${member.role}`)"
      corpus-title="Members"
      @input="search = $event"
      @toggle-regex="regexMode = !regexMode"
      @toggle-builder="regexOpen = !regexOpen"
      @apply-regex="onApplyRegex"
    />

    <div class="st-card st-card--flush">
      <SelectionToolbar
        v-if="members.length > 0"
        :visible-count="filtered.length"
        :selected-count="selectedIds.length"
        item-noun="members"
        @select-all="selectAll"
        @clear="selectedIds = []"
        @invert="invertSelection"
      >
        <button type="button" class="st-btn st-btn--danger st-btn--compact" @click="confirmRemove(selectedIds)">
          Remove selected
        </button>
      </SelectionToolbar>

      <MemberRow
        v-for="member in filtered"
        :key="member.id"
        :member="member"
        :selected="selectedIds.includes(member.id)"
        :menu-open="menuOpenId === member.id"
        @toggle-select="toggleSelect"
        @toggle-menu="toggleMenu"
        @set-role="onSetRole"
        @remove="confirmRemove([$event])"
      />

      <p v-if="members.length === 0" class="st-empty">No members yet.</p>
      <p v-else-if="filtered.length === 0" class="st-empty">No members match "{{ search }}".</p>
    </div>

    <ConfirmDialog
      v-if="pendingRemovalIds"
      title="Remove member access?"
      description="They will lose access to this project immediately. This cannot be undone."
      :items="pendingRemovalNames"
      confirm-label="Remove"
      @confirm="performRemove"
      @cancel="pendingRemovalIds = null"
    />
  </div>
</template>

<script>
import SearchField from './SearchField.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import MemberRow from './MemberRow.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { createMatcher } from '../data';

export default {
  name: 'MembersTab',
  components: { SearchField, SelectionToolbar, MemberRow, ConfirmDialog },
  props: {
    members: { type: Array, required: true },
  },
  data() {
    return {
      search: '',
      regexMode: false,
      regexOpen: false,
      selectedIds: [],
      menuOpenId: null,
      pendingRemovalIds: null,
    };
  },
  computed: {
    matcher() {
      return createMatcher(this.search, { regexMode: this.regexMode });
    },
    filtered() {
      return this.members.filter((member) => this.matcher.test(`${member.name} @${member.handle} ${member.role}`));
    },
    pendingRemovalNames() {
      if (!this.pendingRemovalIds) return [];
      const ids = new Set(this.pendingRemovalIds);
      return this.members.filter((member) => ids.has(member.id)).map((member) => member.name);
    },
  },
  watch: {
    filtered(list) {
      const visible = new Set(list.map((member) => member.id));
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
    selectAll() {
      this.selectedIds = this.filtered.map((member) => member.id);
    },
    invertSelection() {
      const selected = new Set(this.selectedIds);
      this.selectedIds = this.filtered.filter((member) => !selected.has(member.id)).map((member) => member.id);
    },
    toggleMenu(id) {
      this.menuOpenId = this.menuOpenId === id ? null : id;
    },
    onSetRole({ id, role }) {
      this.menuOpenId = null;
      this.$emit('set-role', { id, role });
    },
    confirmRemove(ids) {
      if (ids.length === 0) return;
      this.pendingRemovalIds = ids;
    },
    performRemove() {
      const ids = this.pendingRemovalIds;
      this.pendingRemovalIds = null;
      this.selectedIds = this.selectedIds.filter((id) => !ids.includes(id));
      this.$emit('remove-members', ids);
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
