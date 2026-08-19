<template>
  <div class="gl-mds-admin-health-row">
    <Icon :name="statusIcon" :size="18" class="gl-mds-admin-health-row__icon" :class="`gl-mds-admin-health-row__icon--${status}`" />
    <span class="gl-mds-admin-health-row__label">{{ label }}</span>
    <span class="gl-mds-admin-health-row__note">{{ note }}</span>
  </div>
</template>

<script>
import Icon from './Icon.vue';

const STATUS_ICON = { good: 'check-circle', warn: 'warning', danger: 'error' };

export default {
  name: 'HealthRow',
  components: { Icon },
  props: {
    label: { type: String, required: true },
    note: { type: String, default: '' },
    status: { type: String, default: 'good' },
  },
  computed: {
    statusIcon() {
      return STATUS_ICON[this.status] || 'check-circle';
    },
  },
};
</script>
