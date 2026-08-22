<template>
  <div id="gl-mds-admin-panel-Overview" class="gl-mds-admin-overview" role="tabpanel" aria-labelledby="gl-mds-admin-tab-Overview">
    <div class="gl-mds-admin-overview__stats">
      <StatCard v-for="card in statCards" :key="card.id" :value="card.value" :label="card.label" />
    </div>
    <InstanceHealthCard :health="health" />
  </div>
</template>

<script>
import StatCard from './StatCard.vue';
import InstanceHealthCard from './InstanceHealthCard.vue';

export default {
  name: 'OverviewPanel',
  components: { StatCard, InstanceHealthCard },
  props: {
    statCards: { type: Array, required: true },
    health: { type: Array, required: true },
  },
};
</script>
