<template>
  <div class="secure-page-header">
    <h1 class="secure-page-header__title">Secure</h1>
    <span class="secure-page-header__badge">Ultimate</span>
    <div ref="tablist" class="secure-tabs" role="tablist" aria-label="Secure sections" @keydown="onTablistKeydown">
      <button
        v-for="tab in tabs"
        :id="`secure-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="secure-tabs__tab"
        :class="{ 'secure-tabs__tab--active': tab.id === activeTabId }"
        :aria-selected="tab.id === activeTabId"
        :aria-controls="`secure-panel-${tab.id}`"
        :tabindex="tab.id === activeTabId ? 0 : -1"
        @click="$emit('select-tab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <a
      v-if="securityDashboardPath"
      class="secure-page-header__link"
      :href="securityDashboardPath"
    >
      Security dashboard
      <secure-icon name="chevron-right" :size="16" />
    </a>
    <button v-else type="button" class="secure-page-header__link" @click="$emit('navigate-security-dashboard')">
      Security dashboard
      <secure-icon name="chevron-right" :size="16" />
    </button>
  </div>
</template>

<script>
import SecureIcon from './SecureIcon.vue';

export default {
  name: 'SecurePageHeader',
  components: { SecureIcon },
  props: {
    tabs: { type: Array, required: true },
    activeTabId: { type: String, required: true },
    // Real route to the Security dashboard surface, supplied by the host app.
    // When absent, the link becomes a button that emits an event instead of
    // pointing at a dead href.
    securityDashboardPath: { type: String, default: null },
  },
  methods: {
    onTablistKeydown(event) {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const ids = this.tabs.map((tab) => tab.id);
      const currentIndex = ids.indexOf(this.activeTabId);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ids.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + ids.length) % ids.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = ids.length - 1;
      const nextId = ids[nextIndex];
      this.$emit('select-tab', nextId);
      this.$nextTick(() => {
        const button = this.$refs.tablist.querySelector(`#secure-tab-${nextId}`);
        if (button) button.focus();
      });
    },
  },
};
</script>
