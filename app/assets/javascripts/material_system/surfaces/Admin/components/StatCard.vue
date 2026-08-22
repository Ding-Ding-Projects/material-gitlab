<template>
  <div class="gl-mds-admin-stat">
    <span class="gl-mds-admin-stat__value">{{ value }}</span>
    <span class="gl-mds-admin-stat__label">{{ label }}</span>
  </div>
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    value: { type: String, required: true },
    label: { type: String, required: true },
  },
};
</script>
