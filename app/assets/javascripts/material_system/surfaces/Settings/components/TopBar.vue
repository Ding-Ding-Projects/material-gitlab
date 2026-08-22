<template>
  <header class="st-topbar" data-screen-label="Top bar">
    <div class="st-topbar__spacer"></div>
    <button
      type="button"
      class="st-topbar__icon-btn"
      title="Command palette (Ctrl+Shift+F)"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    >
      <StIcon name="command" />
    </button>
    <button
      type="button"
      class="st-topbar__icon-btn"
      :title="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-pressed="dark"
      @click="$emit('toggle-theme')"
    >
      <StIcon :name="dark ? 'sun' : 'moon'" />
    </button>
    <NotificationHost />
    <div class="st-topbar__avatar" :title="userName" aria-hidden="true">{{ userInitials }}</div>
  </header>
</template>

<script>
import StIcon from './StIcon.vue';
import NotificationHost from './NotificationHost.vue';

export default {
  name: 'TopBar',
  components: { StIcon, NotificationHost },
  props: {
    dark: { type: Boolean, default: false },
    userName: { type: String, default: 'Jordan Diaz' },
    userInitials: { type: String, default: 'JD' },
  },
};
</script>

<style lang="scss" scoped>
.st-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px 8px;
}

.st-topbar__spacer {
  flex: 1;
}

.st-topbar__icon-btn {
  width: var(--st-touch);
  height: var(--st-touch);
  border-radius: var(--st-radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--st-onsurfv);
  flex-shrink: 0;

  &:hover {
    background: var(--st-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-topbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--st-radius-pill);
  background: var(--st-primc);
  color: var(--st-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
</style>
