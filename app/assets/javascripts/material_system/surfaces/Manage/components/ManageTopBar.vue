<template>
  <header class="mg-topbar" data-screen-label="Top bar">
    <div class="mg-topbar__search-wrap">
      <div class="mg-search" :class="{ 'mg-search--invalid': regexMode && !searchValid }">
        <MgIcon name="search" class="mg-search__icon" />
        <label :for="searchInputId" class="mg-visually-hidden">{{ searchPlaceholder }}</label>
        <input
          :id="searchInputId"
          ref="searchInput"
          type="text"
          class="mg-search__input"
          :value="search"
          :placeholder="searchPlaceholder"
          :aria-invalid="regexMode && !searchValid"
          :aria-describedby="regexMode && !searchValid ? `${searchInputId}-error` : null"
          @input="$emit('update:search', $event.target.value)"
        />
        <button
          type="button"
          class="mg-search__pill"
          :class="{ 'mg-search__pill--active': regexMode }"
          :aria-pressed="regexMode"
          title="Toggle regex mode for this search"
          @click="$emit('toggle-regex-mode')"
        >
          .*
        </button>
        <button
          type="button"
          class="mg-search__icon-btn"
          title="Regex builder"
          aria-haspopup="dialog"
          :aria-expanded="regexOpen"
          @click="$emit('open-regex-builder')"
        >
          <MgIcon name="wrench" size="small" />
        </button>
      </div>
      <p v-if="regexMode && !searchValid" :id="`${searchInputId}-error`" class="mg-search__error" role="status">
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
      class="mg-topbar__icon-btn"
      title="Command palette (Ctrl+Shift+F)"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    >
      <MgIcon name="command" />
    </button>
    <button
      type="button"
      class="mg-topbar__icon-btn"
      :title="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-pressed="dark"
      @click="$emit('toggle-theme')"
    >
      <MgIcon :name="dark ? 'sun' : 'moon'" />
    </button>
    <div class="mg-topbar__avatar" :title="userName" aria-hidden="true">{{ userInitials }}</div>
  </header>
</template>

<script>
import MgIcon from './MgIcon.vue';
import RegexBuilderPopover from './RegexBuilderPopover.vue';

export default {
  name: 'ManageTopBar',
  components: { MgIcon, RegexBuilderPopover },
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
    return { searchInputId: `mg-search-${Math.random().toString(36).slice(2, 9)}` };
  },
  methods: {
    focusSearch() {
      this.$refs.searchInput && this.$refs.searchInput.focus();
    },
  },
};
</script>

<style lang="scss" scoped>
.mg-topbar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 24px 8px;
}

.mg-topbar__search-wrap {
  flex: 1;
  max-width: 600px;
  position: relative;
}

.mg-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--mg-surfc);
  border-radius: var(--mg-radius-pill);
  padding: 8px 8px 8px 18px;
  color: var(--mg-onsurfv);
  border: 1px solid transparent;

  &--invalid {
    border-color: var(--mg-err);
  }

  &:focus-within {
    outline: 2px solid var(--mg-prim);
    outline-offset: 1px;
  }
}

.mg-search__icon {
  color: var(--mg-onsurfv);
}

.mg-search__input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--mg-onsurf);
  flex: 1;
  min-width: 0;
}

.mg-search__pill {
  padding: 5px 10px;
  border-radius: var(--mg-radius-pill);
  font-size: 12px;
  font-weight: 700;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  cursor: pointer;
  border: none;
  background: var(--mg-surfch);
  color: var(--mg-onsurfv);

  &--active {
    background: var(--mg-prim);
    color: var(--mg-onprim);
  }

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-search__icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--mg-radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--mg-onsurfv);

  &:hover {
    background: var(--mg-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-search__error {
  margin: 4px 0 0 18px;
  font-size: 12px;
  color: var(--mg-err);
}

.mg-topbar__icon-btn {
  width: var(--mg-touch);
  height: var(--mg-touch);
  border-radius: var(--mg-radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--mg-onsurfv);
  flex-shrink: 0;

  &:hover {
    background: var(--mg-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-topbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-primc);
  color: var(--mg-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
</style>
