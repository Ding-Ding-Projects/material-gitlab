<template>
  <div class="gl-mds-admin-bell">
    <button
      ref="trigger"
      type="button"
      class="gl-mds-admin-iconbtn"
      :aria-label="`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Icon name="bell" />
      <span v-if="unreadCount" class="gl-mds-admin-bell__dot" aria-hidden="true"></span>
    </button>

    <div
      v-if="open"
      ref="panel"
      class="gl-mds-admin-popover gl-mds-admin-popover--notifications"
      role="dialog"
      aria-label="Notification centre"
      aria-modal="false"
      @keydown.esc="close"
    >
      <div class="gl-mds-admin-popover__header">
        <span class="gl-mds-admin-popover__title">Notifications</span>
        <button
          type="button"
          class="gl-mds-admin-btn gl-mds-admin-btn--text gl-mds-admin-btn--sm"
          :disabled="!items.length"
          @click="clearAll"
        >
          Clear all
        </button>
      </div>

      <ul v-if="items.length" class="gl-mds-admin-bell__list">
        <li
          v-for="item in items"
          :key="item.id"
          class="gl-mds-admin-bell__item"
          :class="[`gl-mds-admin-bell__item--${item.severity}`, { 'gl-mds-admin-bell__item--dismissed': item.dismissed }]"
        >
          <div class="gl-mds-admin-bell__item-body">
            <div class="gl-mds-admin-bell__item-title">{{ item.title }}</div>
            <div class="gl-mds-admin-bell__item-message">{{ item.message }}</div>
            <div class="gl-mds-admin-bell__item-time">{{ relativeTime(item.createdAt) }}</div>
          </div>
          <button
            v-if="!item.dismissed"
            type="button"
            class="gl-mds-admin-iconbtn gl-mds-admin-iconbtn--sm"
            :aria-label="`Dismiss: ${item.title}`"
            @click="dismiss(item.id)"
          >
            <Icon name="close" :size="14" />
          </button>
        </li>
      </ul>
      <p v-else class="gl-mds-admin-bell__empty">No notifications yet.</p>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'NotificationBell',
  components: { Icon },
  props: {
    center: { type: Object, required: true },
  },
  data() {
    return { items: [], open: false };
  },
  computed: {
    unreadCount() {
      return this.items.filter((item) => !item.read && !item.dismissed).length;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        document.addEventListener('mousedown', this.handleOutsideClick, true);
        this.items.forEach((item) => this.center.markRead(item.id));
      } else {
        document.removeEventListener('mousedown', this.handleOutsideClick, true);
      }
    },
  },
  created() {
    this.unsubscribe = this.center.subscribe((snapshot) => {
      this.items = snapshot;
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
  },
  methods: {
    close() {
      this.open = false;
      this.$nextTick(() => this.$refs.trigger && this.$refs.trigger.focus());
    },
    dismiss(id) {
      this.center.dismiss(id);
    },
    clearAll() {
      this.center.clear({ includePersistent: true });
    },
    handleOutsideClick(event) {
      if (this.$refs.panel && this.$refs.panel.contains(event.target)) return;
      if (this.$refs.trigger && this.$refs.trigger.contains(event.target)) return;
      this.close();
    },
    relativeTime(iso) {
      const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
      if (seconds < 5) return 'just now';
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.round(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.round(minutes / 60);
      return `${hours}h ago`;
    },
  },
};
</script>
