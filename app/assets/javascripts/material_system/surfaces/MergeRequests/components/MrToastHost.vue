<template>
  <div class="mr-toast-host" role="region" aria-label="Notifications">
    <div
      v-for="toast in notifications"
      :key="toast.id"
      class="mr-toast"
      :data-severity="toast.severity"
      role="status"
      aria-live="polite"
    >
      <div class="mr-toast__body">
        <div v-if="toast.title" class="mr-toast__title">{{ toast.title }}</div>
        <div class="mr-toast__message">{{ toast.message }}</div>
      </div>
      <button
        type="button"
        class="mr-icon-btn mr-toast__dismiss"
        :aria-label="`Dismiss: ${toast.title || toast.message}`"
        @click="dismiss(toast.id)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  </div>
</template>

<script>
import notificationCenter from '~/material_system/notifications';

export default {
  name: 'MrToastHost',
  data() {
    return {
      notifications: [],
    };
  },
  mounted() {
    this.unsubscribe = notificationCenter.subscribe((snapshot) => {
      this.notifications = snapshot.filter((item) => !item.dismissed);
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    dismiss(id) {
      notificationCenter.dismiss(id);
    },
  },
};
</script>
