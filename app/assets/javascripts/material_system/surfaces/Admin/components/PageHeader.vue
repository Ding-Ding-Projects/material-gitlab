<template>
  <div class="gl-mds-admin__header">
    <h1 class="gl-mds-admin__heading">{{ title }}</h1>
    <span class="gl-mds-admin__scope-badge">INSTANCE</span>
    <TabStrip :tabs="tabs" :active="active" @select="$emit('select-tab', $event)" />
  </div>
</template>

<script>
import TabStrip from './TabStrip.vue';

export default {
  name: 'PageHeader',
  components: { TabStrip },
  props: {
    title: { type: String, default: 'Admin area' },
    tabs: { type: Array, required: true },
    active: { type: String, required: true },
  },
};
</script>
