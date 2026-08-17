<template>
  <div class="dp-tabs" role="tablist" aria-label="Deploy sections" data-screen-label="Deploy tabs">
    <button
      v-for="tab in tabs"
      :id="`${instanceId}-tab-${tab.id}`"
      :key="tab.id"
      type="button"
      role="tab"
      class="dp-tabs__tab"
      :class="{ 'dp-tabs__tab--active': tab.id === activeId }"
      :aria-selected="tab.id === activeId"
      :aria-controls="`${instanceId}-tabpanel`"
      :tabindex="tab.id === activeId ? 0 : -1"
      @click="$emit('select', tab.id)"
      @keydown="onKeydown($event, tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'DeployTabs',
  props: {
    tabs: { type: Array, required: true },
    activeId: { type: String, required: true },
    instanceId: { type: String, default: 'dp' },
  },
  methods: {
    onKeydown(event, tabId) {
      const ids = this.tabs.map((tab) => tab.id);
      const index = ids.indexOf(tabId);
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % ids.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + ids.length) % ids.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = ids.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextId = ids[nextIndex];
      this.$emit('select', nextId);
      this.$nextTick(() => {
        const el = this.$el.querySelector(`#${this.instanceId}-tab-${nextId}`);
        if (el) el.focus();
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.dp-tabs {
  display: flex;
  background: var(--dp-surfc);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
  flex-wrap: wrap;
}

.dp-tabs__tab {
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--dp-onsurfv);
  font-family: inherit;

  &:hover {
    background: var(--dp-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-tabs__tab--active {
  background: var(--dp-primc);
  color: var(--dp-onprimc);

  &:hover {
    background: var(--dp-primc);
  }
}
</style>
