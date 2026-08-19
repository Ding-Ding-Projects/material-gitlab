<template>
  <div class="gl-mds-admin-tabs" role="tablist" aria-label="Admin area sections" @keydown="onKeydown">
    <button
      v-for="tab in tabs"
      :id="`gl-mds-admin-tab-${tab}`"
      :key="tab"
      ref="tabs"
      type="button"
      role="tab"
      class="gl-mds-admin-tabs__tab"
      :class="{ 'gl-mds-admin-tabs__tab--active': tab === active }"
      :aria-selected="tab === active"
      :aria-controls="`gl-mds-admin-panel-${tab}`"
      :tabindex="tab === active ? 0 : -1"
      @click="$emit('select', tab)"
    >
      {{ tab }}
    </button>
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
      const index = this.tabs.indexOf(this.active);
      if (index === -1) return;
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = this.tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextTab = this.tabs[nextIndex];
      this.$emit('select', nextTab);
      this.$nextTick(() => {
        const button = this.$refs.tabs && this.$refs.tabs[nextIndex];
        if (button) button.focus();
      });
    },
  },
};
</script>
