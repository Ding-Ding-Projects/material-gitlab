<template>
  <div class="dp-toasts" aria-live="polite" aria-atomic="false">
    <transition-group name="dp-toast" tag="div" class="dp-toasts__stack">
      <div v-for="item in visible" :key="item.id" class="dp-toasts__item" :class="`dp-toasts__item--${item.severity}`" role="status">
        <DpIcon :name="item.severity === 'error' ? 'close' : 'check'" size="small" />
        <div class="dp-toasts__body">
          <p v-if="item.title" class="dp-toasts__title">{{ item.title }}</p>
          <p class="dp-toasts__message">{{ item.message }}</p>
        </div>
        <button
          v-for="action in item.actions"
          :key="action.id"
          type="button"
          class="dp-toasts__action"
          @click="runAction(item.id, action.id)"
        >
          {{ action.label }}
        </button>
        <button type="button" class="dp-toasts__dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <DpIcon name="close" size="small" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import notificationCenter from '../../../notifications';
import DpIcon from './DpIcon.vue';

export default {
  name: 'DeployNotificationHost',
  components: { DpIcon },
  props: {
    // Allows a host app/test to inject its own centre; defaults to the shared singleton.
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return { items: [] };
  },
  computed: {
    visible() {
      return this.items.filter((item) => !item.dismissed).slice(0, 5);
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
    runAction(id, actionId) {
      this.notifications.invokeAction(id, actionId);
      this.notifications.dismiss(id);
    },
  },
};
</script>

<style lang="scss" scoped>
.dp-toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}

.dp-toasts__stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
}

.dp-toasts__item {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 360px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--dp-surfcl);
  color: var(--dp-onsurf);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);

  &--error {
    color: var(--dp-err);
  }
  &--warning {
    color: var(--dp-warn);
  }
  &--success {
    color: var(--dp-good);
  }
}

.dp-toasts__body {
  flex: 1;
  min-width: 0;
}
.dp-toasts__title {
  margin: 0;
  font-weight: 500;
  font-size: 13.5px;
  color: var(--dp-onsurf);
}
.dp-toasts__message {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--dp-onsurfv);
  line-height: 1.4;
}

.dp-toasts__action {
  align-self: center;
  background: none;
  border: none;
  color: var(--dp-onprimc);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;

  &:hover {
    background: var(--dp-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-toasts__dismiss {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  background: none;
  color: var(--dp-onsurfv);
  cursor: pointer;

  &:hover {
    background: var(--dp-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-toast-enter-active,
.dp-toast-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.dp-toast-enter,
.dp-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .dp-toast-enter-active,
  .dp-toast-leave-active {
    transition: none;
  }
}
</style>
