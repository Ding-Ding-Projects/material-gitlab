<template>
  <div class="mgl-pl-toasts" role="region" aria-label="Notifications">
    <div
      v-for="item in visible"
      :key="item.id"
      class="mgl-pl-toast"
      :class="toastClass(item)"
      role="status"
      aria-live="polite"
    >
      <span class="mgl-icon mgl-icon--sm" aria-hidden="true">{{ toastIcon(item) }}</span>
      <div>
        <div v-if="item.title" class="mgl-pl-toast-title">{{ item.title }}</div>
        <div>{{ item.message }}</div>
        <div v-if="item.actions.length" class="mgl-pl-toast-actions">
          <button
            v-for="action in item.actions"
            :key="action.id"
            type="button"
            class="mgl-pl-text-btn"
            @click="runAction(item.id, action.id)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
      <button type="button" class="mgl-pl-toast-close" aria-label="Dismiss notification" @click="dismiss(item.id)">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">close</span>
      </button>
    </div>
  </div>
</template>

<script>
import { notificationCenter } from '../../../notifications';

export default {
  name: 'PipelinesToastStack',
  data() {
    return { items: [] };
  },
  computed: {
    visible() {
      return this.items.filter((item) => !item.dismissed);
    },
  },
  mounted() {
    this.unsubscribe = notificationCenter.subscribe((snapshot) => {
      this.items = snapshot;
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    dismiss(id) {
      notificationCenter.dismiss(id);
    },
    runAction(id, actionId) {
      notificationCenter.invokeAction(id, actionId);
    },
    toastClass(item) {
      if (item.severity === 'error') return 'mgl-pl-toast--error';
      if (item.severity === 'success') return 'mgl-pl-toast--good';
      return '';
    },
    toastIcon(item) {
      if (item.severity === 'error') return 'error';
      if (item.severity === 'warning') return 'warning';
      if (item.severity === 'success') return 'check_circle';
      return 'info';
    },
  },
};
</script>

<style scoped>
.mgl-pl-toast-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.mgl-pl-toast-actions .mgl-pl-text-btn {
  padding: 4px 10px;
  font-size: 12px;
}
</style>
