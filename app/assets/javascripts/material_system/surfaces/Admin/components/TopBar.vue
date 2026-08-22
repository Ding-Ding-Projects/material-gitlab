<template>
  <header class="gl-mds-admin__topbar" data-screen-label="Top bar">
    <SearchField
      class="gl-mds-admin__topbar-search"
      :value="search"
      :regex-mode="searchRegexMode"
      :placeholder="placeholder"
      aria-label="Search users, runners, and projects across the instance"
      icon="search"
      :corpus="corpus"
      @input="$emit('update:search', $event)"
      @update:regex-mode="$emit('update:search-regex-mode', $event)"
    />

    <button
      type="button"
      class="gl-mds-admin-iconbtn"
      title="Command palette (Ctrl+Shift+F)"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    >
      <Icon name="command" />
    </button>

    <NotificationBell :center="notifications" />

    <button
      type="button"
      class="gl-mds-admin-iconbtn"
      :title="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-pressed="dark"
      @click="$emit('toggle-theme')"
    >
      <Icon :name="dark ? 'sun' : 'moon'" />
    </button>

    <AccountMenu :initials="accountInitials" :name="accountName" @sign-out="$emit('sign-out')" />
  </header>
</template>

<script>
import Icon from './Icon.vue';
import SearchField from './SearchField.vue';
import NotificationBell from './NotificationBell.vue';
import AccountMenu from './AccountMenu.vue';

export default {
  name: 'TopBar',
  components: { Icon, SearchField, NotificationBell, AccountMenu },
  props: {
    search: { type: String, default: '' },
    searchRegexMode: { type: Boolean, default: false },
    corpus: { type: Array, default: () => [] },
    dark: { type: Boolean, default: false },
    notifications: { type: Object, required: true },
    accountInitials: { type: String, default: 'JD' },
    accountName: { type: String, default: 'Jordan Diaz' },
  },
  computed: {
    placeholder() {
      return this.searchRegexMode
        ? 'Regex search — users, runners, projects'
        : 'Search users, runners, projects';
    },
  },
};
</script>
