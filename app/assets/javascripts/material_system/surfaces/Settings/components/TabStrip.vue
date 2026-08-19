<template>
  <div class="st-page-heading">
    <h1 class="st-page-heading__title">Settings</h1>
    <div class="st-tabs" role="tablist" aria-label="Settings sections" @keydown="onKeydown">
      <button
        v-for="tab in tabs"
        :id="`st-tab-${tab.id}`"
        :key="tab.id"
        ref="tabButtons"
        type="button"
        role="tab"
        class="st-tabs__tab"
        :class="{ 'st-tabs__tab--active': tab.id === active }"
        :aria-selected="tab.id === active"
        :tabindex="tab.id === active ? 0 : -1"
        :aria-controls="`st-tabpanel-${tab.id}`"
        @click="$emit('select', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TabStrip',
  props: {
    tabs: { type: Array, required: true },
    active: { type: String, required: true },
  },
  methods: {
    onKeydown(event) {
      const index = this.tabs.findIndex((tab) => tab.id === this.active);
      if (index === -1) return;
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = this.tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextTab = this.tabs[nextIndex];
      this.$emit('select', nextTab.id);
      this.$nextTick(() => {
        const button = this.$refs.tabButtons && this.$refs.tabButtons[nextIndex];
        if (button) button.focus();
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.st-page-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  flex-wrap: wrap;
}

.st-page-heading__title {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.st-tabs {
  display: flex;
  background: var(--st-surfc);
  border-radius: var(--st-radius-pill);
  padding: 3px;
  gap: 2px;
  flex-wrap: wrap;
}

.st-tabs__tab {
  padding: 7px 16px;
  border-radius: var(--st-radius-pill);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--st-onsurfv);
  min-height: 32px;

  &--active {
    background: var(--st-primc);
    color: var(--st-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}
</style>
