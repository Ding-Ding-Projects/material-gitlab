<template>
  <div class="gl-mds-view-switch" role="tablist" aria-label="Issues view">
    <button
      type="button"
      role="tab"
      class="gl-mds-view-switch__option"
      :class="{ 'gl-mds-view-switch__option--on': view === 'list' }"
      :aria-selected="view === 'list'"
      @click="$emit('update:view', 'list')"
    >
      List
    </button>
    <button
      type="button"
      role="tab"
      class="gl-mds-view-switch__option"
      :class="{ 'gl-mds-view-switch__option--on': view === 'board' }"
      :aria-selected="view === 'board'"
      @click="$emit('update:view', 'board')"
    >
      Board
    </button>
  </div>
</template>

<script>
export default {
  name: 'ViewSwitcher',
  props: {
    view: { type: String, required: true },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-view-switch {
  display: flex;
  background: var(--gl-mds-surfc);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}

.gl-mds-view-switch__option {
  padding: 7px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--gl-mds-onsurfv);
  font-family: inherit;

  &--on {
    background: var(--gl-mds-primc);
    color: var(--gl-mds-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}
</style>
