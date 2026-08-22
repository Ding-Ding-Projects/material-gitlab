<template>
  <div class="gl-mds-plan__tabs" role="tablist" aria-label="Plan sections" @keydown="onKeydown">
    <button
      v-for="tab in tabs"
      :id="`gl-mds-plan-tab-${tab}`"
      :key="tab"
      type="button"
      role="tab"
      class="gl-mds-plan__tab"
      :class="{ 'gl-mds-plan__tab--active': tab === active }"
      :aria-selected="tab === active"
      :aria-controls="`gl-mds-plan-panel-${tab}`"
      :tabindex="tab === active ? 0 : -1"
      @click="$emit('select', tab)"
    >
      {{ tab }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'PlanTabs',
  props: {
    tabs: { type: Array, required: true },
    active: { type: String, required: true },
  },
  methods: {
    onKeydown(event) {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = this.tabs.indexOf(this.active);
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = this.tabs.length - 1;
      const nextTab = this.tabs[nextIndex];
      this.$emit('select', nextTab);
      this.$nextTick(() => {
        document.getElementById(`gl-mds-plan-tab-${nextTab}`)?.focus();
      });
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__tabs {
  display: flex;
  background: var(--gl-mds-surfc);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
  flex-wrap: wrap;
}

.gl-mds-plan__tab {
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--gl-mds-onsurfv);
  font: inherit;

  &--active {
    background: var(--gl-mds-primc);
    color: var(--gl-mds-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}
</style>
