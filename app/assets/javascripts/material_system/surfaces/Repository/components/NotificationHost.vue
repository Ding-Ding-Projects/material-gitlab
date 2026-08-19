<script>
import notificationCenter from '../../../notifications';
import MIcon from './MIcon.vue';

const SEVERITY_ICON = { info: 'info', success: 'check', warning: 'warning', error: 'warning' };

export default {
  name: 'NotificationHost',
  components: { MIcon },
  data() {
    return { items: notificationCenter.snapshot() };
  },
  mounted() {
    this.unsubscribe = notificationCenter.subscribe((items) => {
      this.items = items;
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    iconFor(severity) {
      return SEVERITY_ICON[severity] || 'info';
    },
    liveRole(severity) {
      return severity === 'error' || severity === 'warning' ? 'alert' : 'status';
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
  <div class="notification-host" aria-live="polite">
    <transition-group name="toast" tag="div" class="notification-host__stack">
      <div
        v-for="item in items.filter((entry) => !entry.dismissed)"
        :key="item.id"
        class="toast"
        :class="`toast--${item.severity}`"
        :role="liveRole(item.severity)"
      >
        <m-icon :name="iconFor(item.severity)" :size="18" class="toast__icon" decorative />
        <div class="toast__body">
          <p v-if="item.title" class="toast__title">{{ item.title }}</p>
          <p class="toast__message">{{ item.message }}</p>
          <div v-if="item.actions.length" class="toast__actions">
            <button
              v-for="action in item.actions"
              :key="action.id"
              type="button"
              class="toast__action"
              @click="runAction(item.id, action.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button type="button" class="toast__dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <m-icon name="close" :size="16" decorative />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.notification-host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 60;
  pointer-events: none;
  max-width: min(360px, calc(100vw - 40px));
}

.notification-host__stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
}

.toast {
  @include overlay-surface(14px);
  @include reduced-motion;

  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  pointer-events: auto;
  color: var(--onsurf);
  border-left: 3px solid var(--outl);

  &--success {
    border-left-color: var(--good);
  }
  &--warning {
    border-left-color: var(--warn);
  }
  &--error {
    border-left-color: var(--err);
  }
}

.toast__icon {
  margin-top: 2px;
  color: var(--onsurfv);
}
.toast--success .toast__icon {
  color: var(--good);
}
.toast--warning .toast__icon {
  color: var(--warn);
}
.toast--error .toast__icon {
  color: var(--err);
}

.toast__body {
  flex: 1;
  min-width: 0;
}

.toast__title {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 700;
}

.toast__message {
  margin: 0;
  font-size: 12.5px;
  color: var(--onsurfv);
  line-height: 1.4;
}

.toast__actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.toast__action {
  @include focus-ring;
  background: none;
  border: none;
  padding: 0;
  color: var(--onprimc);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.toast__dismiss {
  @include focus-ring;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--onsurfv);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--surfch);
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.toast-enter,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
