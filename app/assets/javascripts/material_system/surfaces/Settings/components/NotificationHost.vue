<template>
  <div class="st-notify-host">
    <button
      type="button"
      class="st-notify-bell"
      :aria-expanded="reviewOpen"
      aria-haspopup="dialog"
      title="Notifications"
      @click="reviewOpen = !reviewOpen"
    >
      <StIcon name="notifications" size="small" />
      <span v-if="unreadCount > 0" class="st-notify-bell__badge" aria-hidden="true">{{ unreadCount }}</span>
      <span class="st-visually-hidden">{{ unreadCount }} unread notifications</span>
    </button>

    <div v-if="reviewOpen" class="st-notify-review" role="dialog" aria-label="Notification history" @keydown.esc="reviewOpen = false">
      <div class="st-notify-review__header">
        <h2 class="st-notify-review__title">Notifications</h2>
        <button type="button" class="st-notify-review__link" :disabled="items.length === 0" @click="clearAll">Clear all</button>
      </div>
      <ul class="st-notify-review__list">
        <li v-for="item in items" :key="item.id" class="st-notify-review__item" :class="`st-notify-review__item--${item.severity}`">
          <div class="st-notify-review__item-body">
            <p class="st-notify-review__item-title">{{ item.title }}</p>
            <p class="st-notify-review__item-message">{{ item.message }}</p>
          </div>
          <button type="button" class="st-notify-review__dismiss" aria-label="Dismiss" @click="dismiss(item.id)">
            <StIcon name="close" size="small" />
          </button>
        </li>
        <li v-if="items.length === 0" class="st-notify-review__empty">No notifications yet.</li>
      </ul>
    </div>

    <div class="st-toast-stack" role="status" aria-live="polite">
      <div v-for="item in liveToasts" :key="item.id" class="st-toast" :class="`st-toast--${item.severity}`">
        <p class="st-toast__title">{{ item.title }}</p>
        <p class="st-toast__message">{{ item.message }}</p>
        <button type="button" class="st-toast__dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <StIcon name="close" size="small" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import notificationCenter from '../../../notifications';

export default {
  name: 'NotificationHost',
  components: { StIcon },
  props: {
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return { items: [], reviewOpen: false };
  },
  computed: {
    liveToasts() {
      return this.items.filter((item) => !item.dismissed).slice(0, 4);
    },
    unreadCount() {
      return this.items.filter((item) => !item.dismissed && !item.read).length;
    },
  },
  watch: {
    reviewOpen(open) {
      if (open) this.items.forEach((item) => this.notifications.markRead(item.id));
    },
  },
  created() {
    this.unsubscribe = this.notifications.subscribe((snapshot) => {
      this.items = snapshot;
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    dismiss(id) {
      this.notifications.dismiss(id);
    },
    clearAll() {
      this.notifications.clear();
    },
  },
};
</script>

<style lang="scss" scoped>
.st-notify-host {
  position: relative;
}

.st-notify-bell {
  position: relative;
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

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-notify-bell__badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--st-err);
  color: var(--st-errc);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.st-notify-review {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 40;
  width: min(340px, 90vw);
  max-height: min(420px, 70vh);
  overflow-y: auto;
  background: var(--st-card);
  color: var(--st-onsurf);
  border-radius: 16px;
  box-shadow: var(--st-elevation-3);
  padding: 14px;
}

.st-notify-review__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.st-notify-review__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.st-notify-review__link {
  border: none;
  background: transparent;
  color: var(--st-prim);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-notify-review__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.st-notify-review__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--st-surfcl);
}

.st-notify-review__item-body {
  flex: 1;
  min-width: 0;
}

.st-notify-review__item-title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
}

.st-notify-review__item-message {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--st-onsurfv);
}

.st-notify-review__dismiss {
  border: none;
  background: transparent;
  color: var(--st-onsurfv);
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-notify-review__empty {
  font-size: 12.5px;
  color: var(--st-onsurfv);
  font-style: italic;
  padding: 8px 10px;
}

.st-toast-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 340px;
}

.st-toast {
  position: relative;
  background: var(--st-card);
  color: var(--st-onsurf);
  border-radius: 14px;
  padding: 12px 32px 12px 14px;
  box-shadow: var(--st-elevation-3);
  border-left: 4px solid var(--st-prim);
}

.st-toast--error {
  border-left-color: var(--st-err);
}
.st-toast--warning {
  border-left-color: var(--st-warn);
}
.st-toast--success {
  border-left-color: var(--st-good);
}

.st-toast__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.st-toast__message {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--st-onsurfv);
}

.st-toast__dismiss {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: transparent;
  color: var(--st-onsurfv);
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}
</style>
