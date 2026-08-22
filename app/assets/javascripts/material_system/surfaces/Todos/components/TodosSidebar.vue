<script>
import MdIcon from './MdIcon.vue';

export default {
  name: 'TodosSidebar',
  components: { MdIcon },
  props: {
    sections: {
      type: Array,
      required: true,
    },
    activeLabel: {
      type: String,
      default: '',
    },
    query: {
      type: String,
      default: '',
    },
    regexMode: {
      type: Boolean,
      default: false,
    },
    regexValid: {
      type: Boolean,
      default: true,
    },
  },
};
</script>

<template>
  <nav class="md-todos__sidebar" aria-label="Primary navigation">
    <div class="md-todos__brand">
      <span class="md-todos__brand-mark" aria-hidden="true">G</span>
      GitLab M3
    </div>

    <div class="md-todos__project-chip">
      <span class="md-todos__project-avatar" aria-hidden="true">P</span>
      <div class="md-todos__project-meta">
        <div class="md-todos__project-name">phoenix-api</div>
        <div class="md-todos__project-group">acme-corp</div>
      </div>
    </div>

    <div class="md-todos__nav-search">
      <md-icon name="search" :size="17" class="md-todos__nav-search-icon" />
      <input
        class="md-todos__nav-search-input"
        type="search"
        :value="query"
        placeholder="Search or go to…"
        aria-label="Search or go to a page"
        :aria-invalid="regexMode && !regexValid"
        @input="$emit('update:query', $event.target.value)"
      />
      <button
        type="button"
        class="md-todos__regex-chip"
        :class="{ 'md-todos__regex-chip--active': regexMode }"
        :aria-pressed="regexMode"
        title="Toggle regex mode for navigation search"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="md-todos__icon-button md-todos__icon-button--tiny"
        title="Open regex builder for navigation search"
        aria-label="Open regex builder for navigation search"
        @click="$emit('open-regex-builder')"
      >
        <md-icon name="construction" :size="15" />
      </button>
    </div>

    <div v-for="section in sections" :key="section.name" class="md-todos__nav-section">
      <div class="md-todos__nav-heading">{{ section.name }}</div>
      <a
        v-for="item in section.items"
        :key="section.name + '-' + item.label"
        :href="item.href"
        class="md-todos__nav-link"
        :class="{ 'md-todos__nav-link--active': item.label === activeLabel }"
        :aria-current="item.label === activeLabel ? 'page' : null"
      >
        <md-icon :name="item.icon" class="md-todos__nav-link-icon" />
        {{ item.label }}
      </a>
    </div>

    <p v-if="sections.length === 0" class="md-todos__nav-empty">No navigation items match your search.</p>
  </nav>
</template>
