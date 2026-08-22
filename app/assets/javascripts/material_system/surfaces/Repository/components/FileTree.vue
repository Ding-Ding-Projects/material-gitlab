<script>
import MIcon from './MIcon.vue';
import FileTreeRow from './FileTreeRow.vue';

export default {
  name: 'FileTree',
  components: { MIcon, FileTreeRow },
  props: {
    entries: { type: Array, required: true },
    selected: { type: Array, required: true },
    scopeLabel: { type: String, required: true },
    searchQuery: { type: String, default: '' },
  },
  computed: {
    allSelected() {
      return this.entries.length > 0 && this.entries.every((entry) => this.selected.includes(entry.name));
    },
    someSelected() {
      return this.selected.length > 0 && !this.allSelected;
    },
    selectAllLabel() {
      const count = this.entries.length;
      return `Select all ${count} item${count === 1 ? '' : 's'} in ${this.scopeLabel}`;
    },
  },
  watch: {
    someSelected: 'syncIndeterminate',
    allSelected: 'syncIndeterminate',
  },
  mounted() {
    this.syncIndeterminate();
  },
  methods: {
    syncIndeterminate() {
      if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = this.someSelected;
    },
    isSelected(name) {
      return this.selected.includes(name);
    },
  },
};
</script>

<template>
  <div class="file-tree">
    <div class="file-tree__toolbar">
      <label class="file-tree__select-all">
        <input ref="selectAll" type="checkbox" :checked="allSelected" :disabled="!entries.length" @change="$emit('toggle-select-all')" />
        <span>{{ selectAllLabel }}</span>
      </label>
      <span v-if="selected.length" class="file-tree__count">{{ selected.length }} selected</span>
      <div class="file-tree__bulk-actions">
        <button type="button" class="file-tree__action" :disabled="!entries.length" @click="$emit('invert-selection')">
          Invert selection
        </button>
        <button type="button" class="file-tree__action" :disabled="!selected.length" @click="$emit('clear-selection')">Clear</button>
        <button type="button" class="file-tree__action" :disabled="!selected.length" @click="$emit('copy-paths')">
          <m-icon name="copy" :size="15" decorative />
          Copy paths
        </button>
        <button type="button" class="file-tree__action" :disabled="!selected.length" @click="$emit('download-selected')">
          <m-icon name="download" :size="15" decorative />
          Download
        </button>
        <button type="button" class="file-tree__action file-tree__action--danger" :disabled="!selected.length" @click="$emit('request-delete')">
          <m-icon name="trash" :size="15" decorative />
          Delete
        </button>
      </div>
    </div>

    <div v-if="!entries.length" class="file-tree__empty">
      <template v-if="searchQuery">
        <p>No files match &ldquo;{{ searchQuery }}&rdquo;.</p>
        <button type="button" class="file-tree__action" @click="$emit('clear-search')">Clear filter</button>
      </template>
      <template v-else>
        <p>This folder is empty.</p>
      </template>
    </div>

    <div v-else class="file-tree__rows" role="list">
      <file-tree-row
        v-for="entry in entries"
        :key="entry.name"
        :entry="entry"
        :selected="isSelected(entry.name)"
        role="listitem"
        @open="$emit('open', $event)"
        @toggle-select="$emit('toggle-select', $event)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.file-tree {
  @include card-surface;
  overflow: hidden;
}

.file-tree__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 18px;
  border-bottom: 1px solid var(--outlv);
  background: var(--surfcl);
}

.file-tree__select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--onsurfv);
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: var(--prim);
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--prim);
      outline-offset: 2px;
    }
  }
}

.file-tree__count {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--onprimc);
}

.file-tree__bulk-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.file-tree__action {
  @include focus-ring;
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: var(--surfc);
  color: var(--onsurf);

  &:hover:not(:disabled) {
    background: var(--surfch);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--danger {
    color: var(--err);
  }
}

.file-tree__empty {
  padding: 40px 18px;
  text-align: center;
  color: var(--onsurfv);
  font-size: 13px;

  p {
    margin: 0 0 10px;
  }
}

.file-tree__rows {
  display: flex;
  flex-direction: column;
}
</style>
