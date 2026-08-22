<template>
  <nav class="am-sidebar" aria-label="Project navigation" data-screen-label="Sidebar">
    <div class="am-sidebar__brand">
      <div class="am-sidebar__brand-mark" aria-hidden="true">G</div>
      GitLab M3
    </div>

    <div class="am-sidebar__project">
      <div class="am-sidebar__project-mark" aria-hidden="true">P</div>
      <div class="am-sidebar__project-text">
        <div class="am-sidebar__project-name">phoenix-api</div>
        <div class="am-sidebar__project-group">acme-corp</div>
      </div>
    </div>

    <div class="am-sidebar__search">
      <MaterialIcon name="search" :size="17" />
      <label for="am-nav-search" class="am-visually-hidden">Search or go to…</label>
      <input
        id="am-nav-search"
        type="text"
        placeholder="Search or go to…"
        :value="navQuery"
        @input="navQuery = $event.target.value"
      />
      <kbd>/</kbd>
    </div>

    <div v-for="section in filteredSections" :key="section.name" class="am-sidebar__section">
      <div class="am-sidebar__section-name">{{ section.name }}</div>
      <a
        v-for="item in section.items"
        :key="item.label"
        class="am-sidebar__item"
        :class="{ 'am-sidebar__item--active': isActive(item) }"
        :href="item.href || '#/agent-memory'"
        :aria-current="isActive(item) ? 'page' : null"
        @click="onItemClick($event, item)"
      >
        <MaterialIcon :name="item.icon" :size="19" />
        {{ item.label }}
      </a>
    </div>
  </nav>
</template>

<script>
import { NAV_SECTIONS } from './sidebarNav';
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'AgentMemorySidebar',
  components: { MaterialIcon },
  props: {
    activeTab: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      navQuery: '',
    };
  },
  computed: {
    filteredSections() {
      const query = this.navQuery.trim().toLowerCase();
      if (!query) return NAV_SECTIONS;
      return NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(query)),
      })).filter((section) => section.items.length > 0);
    },
  },
  methods: {
    isActive(item) {
      return item.tabId ? item.tabId === this.activeTab : false;
    },
    onItemClick(event, item) {
      if (!item.tabId) return;
      // A real hash link stays clickable (new tab, copy link); a plain click
      // switches this surface's own tab in place instead of navigating away.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      this.$emit('select-tab', item.tabId);
    },
  },
};
</script>
