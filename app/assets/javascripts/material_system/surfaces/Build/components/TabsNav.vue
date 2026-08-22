<template>
  <div class="build-tabs" role="tablist" aria-label="Build sections" @keydown="onKeydown">
    <button
      v-for="tab in tabs"
      :id="`build-tab-${tab.id}`"
      :key="tab.id"
      ref="tabButtons"
      type="button"
      role="tab"
      class="build-tabs__tab"
      :class="{ 'build-tabs__tab--active': tab.id === active }"
      :aria-selected="tab.id === active"
      :aria-controls="`build-panel-${tab.id}`"
      :tabindex="tab.id === active ? 0 : -1"
      @click="select(tab.id)"
    >{{ tab.label }}</button>
  </div>
</template>

<script>
export default {
  name: 'BuildTabsNav',
  props: {
    tabs: { type: Array, required: true },
    active: { type: String, required: true },
  },
  methods: {
    select(id) {
      this.$emit('change', id);
    },
    onKeydown(event) {
      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const currentIndex = this.tabs.findIndex((t) => t.id === this.active);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = this.tabs.length - 1;
      const nextTab = this.tabs[nextIndex];
      this.select(nextTab.id);
      this.$nextTick(() => {
        const button = this.$refs.tabButtons && this.$refs.tabButtons[nextIndex];
        if (button) button.focus();
      });
    },
  },
};
</script>
