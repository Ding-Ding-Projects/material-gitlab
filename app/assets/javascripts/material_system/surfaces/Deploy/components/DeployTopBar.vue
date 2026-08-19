<template>
  <header class="dp-topbar" data-screen-label="Top bar">
    <div class="dp-topbar__search-wrap">
      <div class="dp-search" :class="{ 'dp-search--invalid': regexMode && !searchValid }">
        <DpIcon name="search" class="dp-search__icon" />
        <label :for="searchInputId" class="dp-visually-hidden">{{ searchPlaceholder }}</label>
        <input
          :id="searchInputId"
          ref="searchInput"
          type="text"
          class="dp-search__input"
          :value="search"
          :placeholder="searchPlaceholder"
          :aria-invalid="regexMode && !searchValid"
          :aria-describedby="regexMode && !searchValid ? `${searchInputId}-error` : null"
          @input="$emit('update:search', $event.target.value)"
        />
        <button
          type="button"
          class="dp-search__pill"
          :class="{ 'dp-search__pill--active': regexMode }"
          :aria-pressed="regexMode"
          title="Toggle regex mode for this search"
          @click="$emit('toggle-regex-mode')"
        >
          .*
        </button>
        <button
          type="button"
          class="dp-search__icon-btn"
          title="Regex builder"
          aria-haspopup="dialog"
          :aria-expanded="regexOpen"
          @click="$emit('open-regex-builder')"
        >
          <DpIcon name="wrench" size="small" />
        </button>
      </div>
      <p v-if="regexMode && !searchValid" :id="`${searchInputId}-error`" class="dp-search__error" role="status">
        Invalid pattern{{ searchError ? `: ${searchError}` : '' }} — showing all results.
      </p>
      <RegexBuilderPopover
        v-if="regexOpen"
        :initial-pattern="regexInitialPattern"
        :corpus="regexCorpus"
        corpus-title="Matches"
        @apply="$emit('apply-regex', $event)"
        @close="$emit('close-regex-builder')"
      />
    </div>

    <button
      type="button"
      class="dp-topbar__icon-btn"
      title="Command palette (Ctrl+Shift+F)"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    >
      <DpIcon name="command" />
    </button>
    <button
      type="button"
      class="dp-topbar__icon-btn"
      :title="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-pressed="dark"
      @click="$emit('toggle-theme')"
    >
      <DpIcon :name="dark ? 'sun' : 'moon'" />
    </button>
    <div class="dp-topbar__avatar" :title="userName" aria-hidden="true">{{ userInitials }}</div>
  </header>
</template>

<script>
import DpIcon from './DpIcon.vue';
import RegexBuilderPopover from './RegexBuilderPopover.vue';

export default {
  name: 'DeployTopBar',
  components: { DpIcon, RegexBuilderPopover },
  props: {
    search: { type: String, default: '' },
    searchPlaceholder: { type: String, default: 'Search' },
    regexMode: { type: Boolean, default: false },
    searchValid: { type: Boolean, default: true },
    searchError: { type: String, default: '' },
    regexOpen: { type: Boolean, default: false },
    regexInitialPattern: { type: String, default: '' },
    regexCorpus: { type: Array, default: () => [] },
    dark: { type: Boolean, default: false },
    userName: { type: String, default: 'Jordan Diaz' },
    userInitials: { type: String, default: 'JD' },
  },
  data() {
    return { searchInputId: `dp-search-${Math.random().toString(36).slice(2, 9)}` };
  },
  methods: {
    focusSearch() {
      this.$refs.searchInput && this.$refs.searchInput.focus();
    },
  },
};
</script>

<style lang="scss" scoped>
.dp-visually-hidden {
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

.dp-topbar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 24px 8px;
}

.dp-topbar__search-wrap {
  flex: 1;
  max-width: 600px;
  position: relative;
}

.dp-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--dp-surfc);
  border-radius: 999px;
  padding: 8px 8px 8px 18px;
  color: var(--dp-onsurfv);
  border: 1px solid transparent;

  &--invalid {
    border-color: var(--dp-err);
  }

  &:focus-within {
    outline: 2px solid var(--dp-prim);
    outline-offset: 1px;
  }
}

.dp-search__icon {
  color: var(--dp-onsurfv);
}

.dp-search__input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--dp-onsurf);
  flex: 1;
  min-width: 0;
}

.dp-search__pill {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  cursor: pointer;
  border: none;
  background: var(--dp-surfch);
  color: var(--dp-onsurfv);

  &--active {
    background: var(--dp-prim);
    color: var(--dp-onprim);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-search__icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--dp-onsurfv);

  &:hover {
    background: var(--dp-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-search__error {
  margin: 4px 0 0 18px;
  font-size: 12px;
  color: var(--dp-err);
}

.dp-topbar__icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--dp-onsurfv);
  flex-shrink: 0;

  &:hover {
    background: var(--dp-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-topbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--dp-primc);
  color: var(--dp-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
</style>
