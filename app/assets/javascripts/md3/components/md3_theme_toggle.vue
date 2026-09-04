<script>
import { __ } from '~/locale';
import Md3Button from './md3_button.vue';

export default {
  name: 'Md3ThemeToggle',
  components: { Md3Button },
  props: {
    // Reuses GitLab's existing dark-mode class (see app/assets/stylesheets/root.scss,
    // ':root.gl-dark') rather than inventing a second theme switch.
    darkClass: {
      type: String,
      required: false,
      default: 'gl-dark',
    },
    storageKey: {
      type: String,
      required: false,
      default: 'gl-md3-color-scheme',
    },
  },
  data() {
    return {
      isDark: false,
    };
  },
  computed: {
    icon() {
      return this.isDark ? 'light_mode' : 'dark_mode';
    },
    label() {
      return this.isDark ? __('Switch to light theme') : __('Switch to dark theme');
    },
  },
  mounted() {
    this.isDark = this.readInitialPreference();
    this.applyTheme(this.isDark, { persist: false });
  },
  methods: {
    readStoredPreference() {
      try {
        const stored = window.localStorage.getItem(this.storageKey);
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
      } catch {
        // Storage may be unavailable (private browsing, disabled cookies); fall through.
      }
      return null;
    },
    readInitialPreference() {
      const stored = this.readStoredPreference();
      if (stored !== null) return stored;
      if (document.documentElement.classList.contains(this.darkClass)) return true;
      try {
        return Boolean(
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
        );
      } catch {
        return false;
      }
    },
    applyTheme(isDark, { persist = true } = {}) {
      document.documentElement.classList.toggle(this.darkClass, isDark);
      if (!persist) return;
      try {
        window.localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
      } catch {
        // Ignore write failures (quota exceeded, storage disabled); the toggle still works
        // for the rest of the session, it just will not persist across reloads.
      }
    },
    toggle() {
      this.isDark = !this.isDark;
      this.applyTheme(this.isDark);
      this.$emit('change', this.isDark);
    },
  },
};
</script>

<template>
  <md3-button
    variant="text"
    size="medium"
    icon-only
    :icon="icon"
    class="md3-theme-toggle"
    :aria-label="label"
    :aria-pressed="isDark ? 'true' : 'false'"
    @click="toggle"
  />
</template>
