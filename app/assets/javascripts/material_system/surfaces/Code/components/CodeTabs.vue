<template>
  <div class="gl-code-heading-row">
    <h1 class="gl-code-heading">Code</h1>
    <div class="gl-code-tablist" role="tablist" aria-label="Code sections" @keydown="onKeydown">
      <button
        v-for="tab in tabs"
        :id="`gl-code-tab-${tab}`"
        :key="tab"
        type="button"
        role="tab"
        class="gl-code-tab"
        :class="{ 'is-active': tab === activeTab }"
        :aria-selected="tab === activeTab ? 'true' : 'false'"
        aria-controls="gl-code-tabpanel"
        :tabindex="tab === activeTab ? 0 : -1"
        @click="$emit('select', tab)"
      >{{ tab }}</button>
    </div>
    <span class="gl-code-count">{{ countLabel }}</span>
  </div>
</template>

<script>
export default {
  name: 'CodeTabs',
  props: {
    tabs: { type: Array, required: true },
    activeTab: { type: String, required: true },
    countLabel: { type: String, default: '' },
  },
  methods: {
    onKeydown(event) {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = this.tabs.indexOf(this.activeTab);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = this.tabs.length - 1;
      const nextTab = this.tabs[nextIndex];
      this.$emit('select', nextTab);
      this.$nextTick(() => {
        const el = this.$el.querySelector(`#gl-code-tab-${CSS.escape(nextTab)}`);
        if (el) el.focus();
      });
    },
  },
};
</script>
