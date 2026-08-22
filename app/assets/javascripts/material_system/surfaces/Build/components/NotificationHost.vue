<template>
  <div class="notify-host">
    <button
      type="button"
      class="notify-host__bell"
      :aria-expanded="historyOpen"
      aria-haspopup="dialog"
      :title="`Notifications (${unreadCount} unread)`"
      @click="historyOpen = !historyOpen"
    >
      <icon name="bell" />
      <span v-if="unreadCount" class="notify-host__count">{{ unreadCount }}</span>
    </button>

    <div v-if="historyOpen" class="notify-history" role="dialog" aria-label="Notification history" @keydown.esc="historyOpen = false">
      <div class="notify-history__header">
        <span>Notifications</span>
        <button type="button" class="btn btn--text" @click="clearAll">Clear all</button>
        <button type="button" class="icon-btn" aria-label="Close notification history" @click="historyOpen = false">
          <icon name="close" />
        </button>
      </div>
      <ul class="notify-history__list">
        <li v-for="item in history" :key="item.id" class="notify-history__item" :class="`notify--${item.severity}`">
          <div class="notify-history__title">{{ item.title }}</div>
          <div v-if="item.message" class="notify-history__message">{{ item.message }}</div>
        </li>
        <li v-if="!history.length" class="notify-history__empty">No notifications yet.</li>
      </ul>
    </div>

    <div class="notify-stack" role="status" aria-live="polite">
      <div v-for="item in visibleToasts" :key="item.id" class="notify-toast" :class="`notify--${item.severity}`">
        <div class="notify-toast__body">
          <div class="notify-toast__title">{{ item.title }}</div>
          <div v-if="item.message" class="notify-toast__message">{{ item.message }}</div>
        </div>
        <button type="button" class="icon-btn" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <icon name="close" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import { notificationCenter } from '../../../notifications';

export default {
  name: 'BuildNotificationHost',
  components: { Icon },
  data() {
    return {
      history: [],
      historyOpen: false,
      unsubscribe: null,
    };
  },
  computed: {
    visibleToasts() {
      return this.history.filter((item) => !item.dismissed);
    },
    unreadCount() {
      return this.history.filter((item) => !item.read).length;
    },
  },
  mounted() {
    this.unsubscribe = notificationCenter.subscribe((snapshot) => {
      this.history = snapshot;
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    dismiss(id) {
      notificationCenter.dismiss(id);
    },
    clearAll() {
      notificationCenter.clear({ includePersistent: true });
    },
  },
};
</script>
