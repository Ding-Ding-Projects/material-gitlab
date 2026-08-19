<template>
  <div class="am-toast-stack" aria-live="polite" aria-relevant="additions">
    <transition-group name="am-toast" tag="div" class="am-toast-stack__inner">
      <div
        v-for="item in visible"
        :key="item.id"
        class="am-toast"
        :class="`am-toast--${item.severity}`"
        role="status"
      >
        <MaterialIcon :name="toastIcon(item.severity)" :size="18" class="am-toast__icon" />
        <div class="am-toast__body">
          <div v-if="item.title" class="am-toast__title">{{ item.title }}</div>
          <div class="am-toast__message">{{ item.message }}</div>
        </div>
        <div v-if="item.actions.length" class="am-toast__actions">
          <button
            v-for="action in item.actions"
            :key="action.id"
            type="button"
            class="am-btn am-btn--text am-btn--small"
            @click="runAction(item.id, action.id)"
          >
            {{ action.label }}
          </button>
        </div>
        <button type="button" class="am-toast__dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <MaterialIcon name="close" :size="14" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { notificationCenter } from '../../../notifications';
import MaterialIcon from './MaterialIcon.vue';

const ICONS = {
  info: 'cloud-sync',
  success: 'check-circle',
  warning: 'warning',
  error: 'warning',
};

export default {
  name: 'NotificationToastHost',
  components: { MaterialIcon },
  data() {
    return {
      items: [],
    };
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
    toastIcon(severity) {
      return ICONS[severity] || ICONS.info;
    },
    dismiss(id) {
      notificationCenter.dismiss(id);
    },
    runAction(id, actionId) {
      notificationCenter.invokeAction(id, actionId);
      notificationCenter.dismiss(id);
    },
  },
};
</script>
