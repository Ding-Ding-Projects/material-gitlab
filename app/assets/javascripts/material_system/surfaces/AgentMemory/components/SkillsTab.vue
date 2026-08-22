<template>
  <div id="am-tabpanel-skills" class="am-tabpanel" role="tabpanel" aria-labelledby="am-tab-skills" tabindex="0">
    <p v-if="loading" class="am-loading-text">Loading skills catalog…</p>
    <template v-else-if="items.length === 0">
      <EmptyState
        icon="chip"
        :message="totalCount === 0 ? 'No skills installed yet.' : 'No skills match your search.'"
        :action-label="totalCount > 0 ? 'Clear search' : ''"
        @action="$emit('clear-search')"
      />
    </template>
    <template v-else>
      <SelectionToolbar
        v-if="selectedIds.length > 0"
        :selected-count="selectedIds.length"
        :visible-count="items.length"
        :total-count="totalCount"
        item-label-plural="skills"
        @select-all="$emit('select-all')"
        @invert="$emit('invert')"
        @clear="$emit('clear')"
      >
        <template #actions>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-copy')">
            <MaterialIcon name="clipboard" :size="16" /> Copy names
          </button>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-reinstall')">
            <MaterialIcon name="sync" :size="16" /> Reinstall selected
          </button>
          <button
            type="button"
            class="am-btn am-btn--text am-btn--small am-btn--danger-text"
            @click="$emit('bulk-uninstall')"
          >
            <MaterialIcon name="trash" :size="16" /> Uninstall selected
          </button>
        </template>
      </SelectionToolbar>
      <div class="am-skills-grid">
        <SkillCard
          v-for="skill in items"
          :key="skill.id"
          :skill="skill"
          :selected="selectedIds.includes(skill.id)"
          @toggle-select="$emit('toggle-select', $event)"
          @uninstall="$emit('uninstall', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script>
import EmptyState from './EmptyState.vue';
import MaterialIcon from './MaterialIcon.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import SkillCard from './SkillCard.vue';

export default {
  name: 'SkillsTab',
  components: { EmptyState, SkillCard, SelectionToolbar, MaterialIcon },
  props: {
    items: {
      type: Array,
      required: true,
    },
    totalCount: {
      type: Number,
      required: true,
    },
    selectedIds: {
      type: Array,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
