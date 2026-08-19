<template>
  <nav class="gl-mds-plan__wikinav" aria-label="Wiki pages">
    <button
      v-for="page in pages"
      :key="page.id"
      type="button"
      class="gl-mds-plan__wiki-item"
      :class="{ 'gl-mds-plan__wiki-item--active': page.id === activeId }"
      :aria-current="page.id === activeId ? 'page' : null"
      @click="$emit('select', page.id)"
    >
      {{ page.title }}
    </button>
    <div v-if="pages.length === 0" class="gl-mds-plan__empty gl-mds-plan__empty--compact">Nothing matches.</div>
  </nav>
</template>

<script>
export default {
  name: 'WikiPageList',
  props: {
    pages: { type: Array, required: true },
    activeId: { type: String, default: '' },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__wikinav {
  background: var(--gl-mds-surfc);
  border-radius: 16px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gl-mds-plan__wiki-item {
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--gl-mds-onsurf);
  font: inherit;

  &--active { background: var(--gl-mds-sec); }
  &:hover { background: var(--gl-mds-surfch); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: -2px; }
}

.gl-mds-plan__empty--compact {
  padding: 16px 8px;
  font-size: 12.5px;
}
</style>
