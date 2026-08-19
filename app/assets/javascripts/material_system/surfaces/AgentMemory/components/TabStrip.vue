<template>
  <div class="am-tabstrip" role="tablist" aria-label="Agent Memory sections" @keydown="onKeydown">
    <button
      v-for="(tab, index) in tabs"
      :id="`am-tab-${tab.key}`"
      :key="tab.key"
      ref="tabButtons"
      type="button"
      role="tab"
      class="am-tabstrip__tab"
      :class="{ 'am-tabstrip__tab--active': tab.key === active }"
      :aria-selected="tab.key === active ? 'true' : 'false'"
      :aria-controls="`am-tabpanel-${tab.key}`"
      :tabindex="tab.key === active ? 0 : -1"
      :data-index="index"
      @click="select(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'TabStrip',
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    active: {
      type: String,
      required: true,
    },
  },
  methods: {
    select(key) {
      this.$emit('change', key);
    },
    onKeydown(event) {
      const currentIndex = this.tabs.findIndex((tab) => tab.key === this.active);
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = this.tabs.length - 1;
      else return;
      event.preventDefault();
      const nextTab = this.tabs[nextIndex];
      this.select(nextTab.key);
      this.$nextTick(() => {
        const btn = this.$refs.tabButtons && this.$refs.tabButtons[nextIndex];
        if (btn) btn.focus();
      });
    },
  },
};
</script>
