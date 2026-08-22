<template>
  <div class="gl-mds-admin-card gl-mds-admin-health">
    <div class="gl-mds-admin-health__title">Instance health</div>
    <HealthRow v-for="row in health" :key="row.id" :label="row.label" :note="row.note" :status="row.status" />
  </div>
</template>

<script>
import HealthRow from './HealthRow.vue';

export default {
  name: 'InstanceHealthCard',
  components: { HealthRow },
  props: {
    health: { type: Array, required: true },
  },
};
</script>
