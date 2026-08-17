<template>
  <div class="gl-mds-plan__toasts" aria-live="polite" aria-atomic="false">
    <transition-group name="gl-mds-plan-toast" tag="div" class="gl-mds-plan__toasts-stack">
      <div
        v-for="item in visible"
        :key="item.id"
        class="gl-mds-plan__toast"
        :class="`gl-mds-plan__toast--${item.severity}`"
        role="status"
      >
        <mds-icon :name="iconFor(item.severity)" size="sm" />
        <div class="gl-mds-plan__toast-body">
          <p v-if="item.title" class="gl-mds-plan__toast-title">{{ item.title }}</p>
          <p class="gl-mds-plan__toast-message">{{ item.message }}</p>
        </div>
        <button
          v-for="action in item.actions"
          :key="action.id"
          type="button"
          class="gl-mds-plan__toast-action"
          @click="runAction(item.id, action.id)"
        >
          {{ action.label }}
        </button>
        <button type="button" class="gl-mds-plan__toast-dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
          <mds-icon name="close" size="sm" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import notificationCenter from '../../../notifications';
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'NotificationStack',
  components: { MdsIcon },
  data() {
    return { items: [] };
  },
  computed: {
    visible() {
      return this.items.filter((item) => !item.dismissed).slice(0, 5);
    },
  },
  created() {
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
      notificationCenter.dismiss(id);
    },
    iconFor(severity) {
      if (severity === 'error') return 'error';
      if (severity === 'warning') return 'warning';
      if (severity === 'success') return 'check';
      return 'error';
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
}

.gl-mds-plan__toasts-stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
}

.gl-mds-plan__toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 360px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--gl-mds-surfcl);
  color: var(--gl-mds-onsurf);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
  border: 1px solid var(--gl-mds-outlv);

  &--error { color: var(--gl-mds-err); }
  &--warning { color: var(--gl-mds-warn); }
  &--success { color: var(--gl-mds-good); }
}

.gl-mds-plan__toast-body { flex: 1; min-width: 0; }
.gl-mds-plan__toast-title { margin: 0; font-weight: 500; font-size: 13.5px; color: var(--gl-mds-onsurf); }
.gl-mds-plan__toast-message { margin: 2px 0 0; font-size: 12.5px; color: var(--gl-mds-onsurfv); line-height: 1.4; }

.gl-mds-plan__toast-action {
  align-self: center;
  background: none;
  border: none;
  color: var(--gl-mds-onprimc);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;

  &:hover { background: var(--gl-mds-surfch); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}

.gl-mds-plan__toast-dismiss {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  background: none;
  color: var(--gl-mds-onsurfv);
  cursor: pointer;

  &:hover { background: var(--gl-mds-surfch); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}

.gl-mds-plan-toast-enter-active,
.gl-mds-plan-toast-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.gl-mds-plan-toast-enter,
.gl-mds-plan-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .gl-mds-plan-toast-enter-active,
  .gl-mds-plan-toast-leave-active {
    transition: none;
  }
}
</style>
