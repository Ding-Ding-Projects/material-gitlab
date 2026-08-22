<template>
  <div
    id="am-tabpanel-instructions"
    class="am-tabpanel"
    role="tabpanel"
    aria-labelledby="am-tab-instructions"
    tabindex="0"
  >
    <div class="am-targets-row">
      <TargetCard v-for="target in targets" :key="target.id" :target="target" />
    </div>

    <p v-if="loading" class="am-loading-text">Loading instruction blocks…</p>
    <template v-else-if="items.length === 0">
      <EmptyState
        icon="document"
        :message="totalCount === 0 ? 'No managed instruction blocks yet.' : `No instruction blocks match your search.`"
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
        item-label-plural="instruction blocks"
        @select-all="$emit('select-all')"
        @invert="$emit('invert')"
        @clear="$emit('clear')"
      >
        <template #actions>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-copy')">
            <MaterialIcon name="clipboard" :size="16" /> Copy titles
          </button>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-export')">
            <MaterialIcon name="save" :size="16" /> Export as Markdown
          </button>
        </template>
      </SelectionToolbar>
      <div class="am-card am-list-card">
        <InstructionBlockRow
          v-for="block in items"
          :key="block.id"
          :block="block"
          :selected="selectedIds.includes(block.id)"
          @toggle-select="$emit('toggle-select', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script>
import EmptyState from './EmptyState.vue';
import InstructionBlockRow from './InstructionBlockRow.vue';
import MaterialIcon from './MaterialIcon.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import TargetCard from './TargetCard.vue';

export default {
  name: 'InstructionsTab',
  components: { TargetCard, EmptyState, InstructionBlockRow, SelectionToolbar, MaterialIcon },
  props: {
    targets: {
      type: Array,
      required: true,
    },
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
