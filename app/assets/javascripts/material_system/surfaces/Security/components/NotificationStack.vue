<script>
import notificationCenter from '../../../notifications';
import MaterialIcon from './icons/MaterialIcon.vue';

const SEVERITY_ICON = {
  info: 'addCircle',
  success: 'check',
  warning: 'tune',
  error: 'close',
};

/**
 * Non-blocking toast stack anchored to a screen corner, backed by the shared
 * `notificationCenter` primitive. Errors and warnings persist until dismissed;
 * everything else auto-dismisses on its own timeout.
 */
export default {
  name: 'NotificationStack',
  components: { MaterialIcon },
  data() {
    return {
      items: [],
    };
  },
  mounted() {
    this.unsubscribe = notificationCenter.subscribe((snapshot) => {
      this.items = snapshot.filter((item) => !item.dismissed);
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    iconFor(severity) {
      return SEVERITY_ICON[severity] || SEVERITY_ICON.info;
    },
    dismiss(id) {
      notificationCenter.dismiss(id);
    },
    runAction(itemId, actionId) {
      notificationCenter.invokeAction(itemId, actionId);
      notificationCenter.dismiss(itemId);
    },
  },
};
</script>

<template>
  <div class="sec-toast-stack" role="region" aria-label="Notifications">
    <transition-group name="sec-toast" tag="div">
      <div
        v-for="item in items"
        :key="item.id"
        class="sec-toast"
        :class="`sec-toast--${item.severity}`"
        role="status"
        aria-live="polite"
      >
        <material-icon :name="iconFor(item.severity)" :size="18" />
        <div class="sec-toast__body">
          <div v-if="item.title" class="sec-toast__title">{{ item.title }}</div>
          <div class="sec-toast__message">{{ item.message }}</div>
          <div v-if="item.actions.length" class="sec-toast__actions">
            <button
              v-for="action in item.actions"
              :key="action.id"
              type="button"
              class="sec-text-button"
              @click="runAction(item.id, action.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button type="button" class="sec-icon-button" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <material-icon name="close" :size="16" />
        </button>
      </div>
    </transition-group>
  </div>
</template>
