<template>
  <div class="st-branch-row" data-screen-label="Protected branch row">
    <input
      type="checkbox"
      class="st-branch-row__checkbox"
      :checked="selected"
      :aria-label="`Select branch ${branch.name}`"
      @change="$emit('toggle-select', branch.id)"
    />
    <span class="st-branch-row__name">{{ branch.name }}</span>
    <span class="st-branch-row__rule">Merge: {{ branch.merge }} · Push: {{ branch.push }}</span>
    <button type="button" class="st-branch-row__unprotect" @click="$emit('unprotect', branch.id)">Unprotect</button>
  </div>
</template>

<script>
export default {
  name: 'ProtectedBranchRow',
  props: {
    branch: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>

<style lang="scss" scoped>
.st-branch-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--st-outlv);
  border-radius: 12px;
  padding: 10px 14px;
}

.st-branch-row__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--st-prim);
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-branch-row__name {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  min-width: 160px;
}

.st-branch-row__rule {
  font-size: 12px;
  color: var(--st-onsurfv);
  flex: 1;
  min-width: 0;
}

.st-branch-row__unprotect {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--st-err);
  cursor: pointer;
  border: none;
  background: transparent;
  padding: 8px 10px;
  border-radius: 8px;
  min-height: 36px;

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}
</style>
