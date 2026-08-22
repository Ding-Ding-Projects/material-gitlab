<script>
import MIcon from './MIcon.vue';

export default {
  name: 'BranchSwitcher',
  components: { MIcon },
  props: {
    branches: { type: Array, required: true },
    activeBranch: { type: String, required: true },
  },
  data() {
    return { open: false, maxHeight: null };
  },
  methods: {
    toggle() {
      this.open = !this.open;
      if (this.open) this.$nextTick(this.clampToViewport);
    },
    closeMenu() {
      this.open = false;
      this.$nextTick(() => this.$refs.trigger && this.$refs.trigger.focus());
    },
    pick(branch) {
      this.$emit('switch', branch);
      this.closeMenu();
    },
    clampToViewport() {
      const menu = this.$refs.menu;
      if (!menu) return;
      const rect = menu.getBoundingClientRect();
      const available = window.innerHeight - rect.top - 16;
      this.maxHeight = available < rect.height ? `${Math.max(120, available)}px` : null;
    },
  },
};
</script>

<template>
  <div class="branch-switcher">
    <button
      ref="trigger"
      type="button"
      class="branch-switcher__trigger"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
      @keydown.esc="closeMenu"
    >
      <m-icon name="branch" :size="17" decorative class="branch-switcher__icon" />
      {{ activeBranch }}
      <m-icon name="chevron-down" :size="17" decorative class="branch-switcher__icon" />
    </button>
    <div v-if="open" ref="menu" class="branch-switcher__menu" role="menu" :style="{ maxHeight }">
      <button
        v-for="branch in branches"
        :key="branch"
        type="button"
        role="menuitemradio"
        class="branch-switcher__item"
        :class="{ 'is-active': branch === activeBranch }"
        :aria-checked="branch === activeBranch"
        @click="pick(branch)"
      >
        {{ branch }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.branch-switcher {
  position: relative;
}

.branch-switcher__trigger {
  @include focus-ring;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surfc);
  border: none;
  border-radius: 12px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--onsurf);
  font-family: monospace;
}

.branch-switcher__icon {
  color: var(--onsurfv);
}

.branch-switcher__menu {
  @include overlay-surface(14px);
  @include thin-scrollbar;

  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 220px;
  max-width: min(320px, calc(100vw - 32px));
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.branch-switcher__item {
  @include focus-ring;
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 13px;
  font-family: monospace;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--onsurf);

  &:hover {
    background: var(--surfch);
  }

  &.is-active {
    background: var(--sec);
  }
}
</style>
