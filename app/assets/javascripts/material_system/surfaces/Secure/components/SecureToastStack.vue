<template>
  <div class="secure-toasts" role="status" aria-live="polite" aria-label="Notifications">
    <div
      v-for="item in visibleItems"
      :key="item.id"
      class="secure-toast"
      :class="`secure-toast--${item.severity}`"
    >
      <span class="secure-toast__icon"><secure-icon :name="iconFor(item.severity)" :size="18" /></span>
      <div class="secure-toast__body">
        <div v-if="item.title" class="secure-toast__title">{{ item.title }}</div>
        <div class="secure-toast__message">{{ item.message }}</div>
      </div>
      <button type="button" class="secure-toast__dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
        <secure-icon name="close" :size="14" />
      </button>
    </div>
  </div>
</template>

<script>
import SecureIcon from './SecureIcon.vue';
import { notificationCenter } from '../../../notifications';

const ICONS = { error: 'alert-triangle', warning: 'alert-triangle', success: 'check-circle', info: 'info' };

export default {
  name: 'SecureToastStack',
  components: { SecureIcon },
  data() {
    return { items: [] };
  },
  computed: {
    visibleItems() {
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
    iconFor(severity) {
      return ICONS[severity] || 'info';
    },
    dismiss(id) {
      notificationCenter.dismiss(id);
    },
  },
};
</script>
