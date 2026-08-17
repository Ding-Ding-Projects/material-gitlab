<template>
  <div class="gl-mds-admin-toasts" aria-live="polite" aria-atomic="false">
    <div
      v-for="item in visible"
      :key="item.id"
      class="gl-mds-admin-toast"
      :class="`gl-mds-admin-toast--${item.severity}`"
      role="status"
    >
      <div class="gl-mds-admin-toast__body">
        <div v-if="item.title" class="gl-mds-admin-toast__title">{{ item.title }}</div>
        <div class="gl-mds-admin-toast__message">{{ item.message }}</div>
      </div>
      <div v-if="item.actions.length" class="gl-mds-admin-toast__actions">
        <button
          v-for="action in item.actions"
          :key="action.id"
          type="button"
          class="gl-mds-admin-btn gl-mds-admin-btn--text gl-mds-admin-btn--sm"
          @click="runAction(item.id, action.id)"
        >
          {{ action.label }}
        </button>
      </div>
      <button type="button" class="gl-mds-admin-iconbtn gl-mds-admin-iconbtn--sm" aria-label="Dismiss notification" @click="center.dismiss(item.id)">
        <Icon name="close" :size="14" />
      </button>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'ToastStack',
  components: { Icon },
  props: {
    center: { type: Object, required: true },
  },
  data() {
    return { items: [] };
  },
  computed: {
    visible() {
      return this.items.filter((item) => !item.dismissed);
    },
  },
  created() {
    this.unsubscribe = this.center.subscribe((snapshot) => {
      this.items = snapshot;
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    runAction(id, actionId) {
      this.center.invokeAction(id, actionId);
    },
  },
};
</script>
