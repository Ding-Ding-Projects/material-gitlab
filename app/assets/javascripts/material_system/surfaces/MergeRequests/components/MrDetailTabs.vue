<template>
  <div class="mr-detail__tabs" role="tablist" aria-label="Merge request sections" @keydown="onKeydown">
    <button
      v-for="tab in tabs"
      :id="`mr-tab-${tab.id}`"
      :key="tab.id"
      ref="tabs"
      type="button"
      class="mr-detail__tab"
      role="tab"
      :aria-selected="activeTab === tab.id ? 'true' : 'false'"
      :aria-controls="`mr-tabpanel-${tab.id}`"
      :tabindex="activeTab === tab.id ? 0 : -1"
      @click="select(tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script>
import { DETAIL_TABS } from '../data';

export default {
  name: 'MrDetailTabs',
  props: {
    activeTab: { type: String, required: true },
  },
  data() {
    return { tabs: DETAIL_TABS };
  },
  methods: {
    select(tabId) {
      this.$emit('change', tabId);
    },
    onKeydown(event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const currentIndex = this.tabs.findIndex((tab) => tab.id === this.activeTab);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + delta + this.tabs.length) % this.tabs.length;
      const nextTab = this.tabs[nextIndex];
      this.select(nextTab.id);
      this.$nextTick(() => {
        const target = this.$refs.tabs && this.$refs.tabs[nextIndex];
        if (target) target.focus();
      });
    },
  },
};
</script>
