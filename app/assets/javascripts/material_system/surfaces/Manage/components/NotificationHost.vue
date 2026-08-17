<template>
  <div class="mg-notify-host" aria-live="polite" aria-atomic="false">
    <div v-for="item in items" :key="item.id" class="mg-notify" :class="`mg-notify--${item.severity}`" role="status">
      <div class="mg-notify__body">
        <p v-if="item.title" class="mg-notify__title">{{ item.title }}</p>
        <p class="mg-notify__message">{{ item.message }}</p>
      </div>
      <div v-if="item.actions.length" class="mg-notify__actions">
        <button
          v-for="action in item.actions"
          :key="action.id"
          type="button"
          class="mg-notify__action"
          @click="runAction(item.id, action.id)"
        >
          {{ action.label }}
        </button>
      </div>
      <button type="button" class="mg-notify__dismiss" aria-label="Dismiss notification" @click="dismiss(item.id)">
        <MgIcon name="close" size="small" />
      </button>
    </div>
  </div>
</template>

<script>
import MgIcon from './MgIcon.vue';
import notificationCenter from '../../../notifications';

export default {
  name: 'NotificationHost',
  components: { MgIcon },
  data() {
    return { items: [] };
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

<style lang="scss" scoped>
.mg-notify-host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 200;
  max-width: 360px;
  width: calc(100vw - 40px);
}

.mg-notify {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--mg-surfch);
  color: var(--mg-onsurf);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: var(--mg-elevation-3);
  border-left: 4px solid var(--mg-prim);
}

.mg-notify--error {
  border-left-color: var(--mg-err);
}
.mg-notify--warning {
  border-left-color: var(--mg-warn);
}
.mg-notify--success {
  border-left-color: var(--mg-good);
}

.mg-notify__body {
  flex: 1;
  min-width: 0;
}

.mg-notify__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.mg-notify__message {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--mg-onsurfv);
  overflow-wrap: anywhere;
}

.mg-notify__actions {
  display: flex;
  gap: 6px;
}

.mg-notify__action {
  border: none;
  background: transparent;
  color: var(--mg-prim);
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-notify__dismiss {
  border: none;
  background: transparent;
  color: var(--mg-onsurfv);
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--mg-surfc);
  }
  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}
</style>
