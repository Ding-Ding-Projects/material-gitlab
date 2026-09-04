<script>
import { __ } from '~/locale';

export default {
  name: 'Md3NavDrawer',
  props: {
    sections: {
      type: Array,
      required: true,
      validator: (sections) =>
        sections.every(
          (section) => typeof section.name === 'string' && Array.isArray(section.items),
        ),
    },
    label: {
      type: String,
      required: false,
      default: () => __('Primary navigation'),
    },
    filterLabel: {
      type: String,
      required: false,
      default: () => __('Search or go to…'),
    },
    emptyText: {
      type: String,
      required: false,
      default: () => __('No matching items.'),
    },
    enableSlashShortcut: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  data() {
    return {
      query: '',
    };
  },
  computed: {
    filteredSections() {
      const needle = this.query.trim().toLowerCase();
      if (!needle) return this.sections;
      return this.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.label.toLowerCase().includes(needle)),
        }))
        .filter((section) => section.items.length > 0);
    },
  },
  mounted() {
    if (this.enableSlashShortcut) {
      document.addEventListener('keydown', this.handleGlobalKeydown);
    }
  },
  beforeDestroy() {
    if (this.enableSlashShortcut) {
      document.removeEventListener('keydown', this.handleGlobalKeydown);
    }
  },
  methods: {
    slug(text) {
      return String(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    },
    handleFilterInput(event) {
      this.query = event.target.value;
      this.$emit('filter-change', this.query);
    },
    focusFilter() {
      if (this.$refs.filterInput) this.$refs.filterInput.focus();
    },
    handleGlobalKeydown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const { target } = event;
      const tag = target && target.tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable);
      if (isEditable) return;
      event.preventDefault();
      this.focusFilter();
    },
  },
};
</script>

<template>
  <nav class="md3-nav-drawer" :aria-label="label">
    <div class="md3-nav-drawer__filter">
      <span class="material-symbols-outlined md3-nav-drawer__filter-icon" aria-hidden="true"
        >search</span
      >
      <input
        ref="filterInput"
        type="search"
        class="md3-nav-drawer__filter-input"
        :placeholder="filterLabel"
        :aria-label="filterLabel"
        :value="query"
        @input="handleFilterInput"
      />
      <span v-if="enableSlashShortcut" class="md3-nav-drawer__filter-hint" aria-hidden="true"
        >/</span
      >
    </div>
    <div class="md3-nav-drawer__sections">
      <div
        v-for="section in filteredSections"
        :key="section.name"
        class="md3-nav-drawer__section"
      >
        <div :id="`md3-nav-drawer-section-${slug(section.name)}`" class="md3-nav-drawer__section-label">
          {{ section.name }}
        </div>
        <ul
          class="md3-nav-drawer__list"
          :aria-labelledby="`md3-nav-drawer-section-${slug(section.name)}`"
        >
          <li v-for="item in section.items" :key="item.href || item.label" class="md3-nav-drawer__item">
            <a
              :href="item.href || '#'"
              class="md3-nav-drawer__link"
              :class="{ 'md3-nav-drawer__link--active': item.active }"
              :aria-current="item.active ? 'page' : null"
            >
              <span
                v-if="item.icon"
                class="material-symbols-outlined md3-nav-drawer__link-icon"
                aria-hidden="true"
                >{{ item.icon }}</span
              >
              <span class="md3-nav-drawer__link-label">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </div>
      <p v-if="filteredSections.length === 0" class="md3-nav-drawer__empty">{{ emptyText }}</p>
    </div>
  </nav>
</template>
