<template>
  <div class="gl-mds-search">
    <div class="gl-mds-search__field">
      <mds-icon name="search" />
      <label class="gl-mds-sr-only" for="gl-mds-issue-search">{{ placeholder }}</label>
      <input
        id="gl-mds-issue-search"
        class="gl-mds-search__input"
        type="search"
        :value="search"
        :placeholder="placeholder"
        autocomplete="off"
        @input="$emit('update:search', $event.target.value)"
      />
      <button
        type="button"
        class="gl-mds-search__regex-toggle"
        :class="{ 'gl-mds-search__regex-toggle--on': regexMode }"
        :aria-pressed="regexMode"
        title="Regex mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="gl-mds-search__builder-trigger"
        title="Regex builder"
        aria-haspopup="dialog"
        @click="$emit('open-regex-builder')"
      >
        <mds-icon name="construction" size="sm" />
        <span class="gl-mds-sr-only">Open regex builder</span>
      </button>
    </div>
    <span v-if="regexError" class="gl-mds-search__error" role="alert">invalid regex</span>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'IssueSearchBar',
  components: { MdsIcon },
  props: {
    search: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    regexError: { type: Boolean, default: false },
  },
  computed: {
    placeholder() {
      return this.regexMode ? 'Regex search — pattern applies to title, labels, id' : 'Search or filter issues';
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-search {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gl-mds-search__field {
  flex: 1;
  max-width: 600px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--gl-mds-surfc);
  border-radius: 999px;
  padding: 8px 8px 8px 18px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-search__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--gl-mds-onsurf);

  &::-webkit-search-cancel-button { -webkit-appearance: none; }
}

.gl-mds-search__regex-toggle {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
  cursor: pointer;
  border: none;
  background: var(--gl-mds-surfch);
  color: var(--gl-mds-onsurfv);

  &--on {
    background: var(--gl-mds-prim);
    color: var(--gl-mds-onprim);
  }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-search__builder-trigger {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--gl-mds-onsurfv);
  cursor: pointer;

  &:hover { background: var(--gl-mds-surfch); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-search__error {
  font-size: 12px;
  color: var(--gl-mds-err);
}

.gl-mds-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
