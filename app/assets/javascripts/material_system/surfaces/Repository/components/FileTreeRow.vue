<script>
import MIcon from './MIcon.vue';
import MaterialButton from '../../../components/material_button';
import MaterialCheckbox from '../../../components/material_checkbox';

export default {
  name: 'FileTreeRow',
  components: { MIcon, MaterialButton, MaterialCheckbox },
  props: {
    entry: {
      type: Object,
      required: true,
      // { name, kind, message, when }
    },
    selected: { type: Boolean, default: false },
  },
  computed: {
    icon() {
      return this.entry.kind === 'dir' ? 'folder' : 'file';
    },
  },
};
</script>

<template>
  <div class="tree-row" :class="{ 'is-selected': selected }">
    <label class="tree-row__select">
      <span class="visually-hidden">Select {{ entry.name }}</span>
      <material-checkbox :checked="selected" :aria-label="`Select ${entry.name}`" @change="$emit('toggle-select', entry.name)" @click.stop></material-checkbox>
    </label>
    <material-button type="button" variant="text" class="tree-row__open" @click="$emit('open', entry)">
      <m-icon :name="icon" :size="19" class="tree-row__icon" :class="entry.kind === 'dir' ? 'is-dir' : 'is-file'" decorative />
      <span class="tree-row__name">{{ entry.name }}</span>
      <span class="tree-row__message">{{ entry.message }}</span>
      <span class="tree-row__when">{{ entry.when }}</span>
    </material-button>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--outlv);

  &:last-child {
    border-bottom: none;
  }

  &.is-selected {
    background: var(--primc);
  }
}

.tree-row__select {
  display: flex;
  align-items: center;
  padding-left: 14px;
  cursor: pointer;

  md-checkbox {
    --md-checkbox-selected-container-color: var(--prim);
    --md-checkbox-selected-icon-color: var(--onprim);
    --md-checkbox-unselected-outline-color: var(--outl);
    cursor: pointer;
  }

  md-checkbox:focus-visible {
    outline: 2px solid var(--prim);
    outline-offset: 2px;
  }
}

.tree-row__open {
  @include focus-ring;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px 11px 8px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--onsurf);

  &:hover {
    background: var(--surfcl);
  }
}

.tree-row__icon.is-dir {
  color: var(--prim);
}
.tree-row__icon.is-file {
  color: var(--onsurfv);
}

.tree-row__name {
  font-family: monospace;
  font-size: 13px;
  min-width: 180px;
}

.tree-row__message {
  flex: 1;
  font-size: 12.5px;
  color: var(--onsurfv);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-row__when {
  font-size: 12px;
  color: var(--onsurfv);
  flex-shrink: 0;
}

.visually-hidden {
  @include visually-hidden;
}
</style>
