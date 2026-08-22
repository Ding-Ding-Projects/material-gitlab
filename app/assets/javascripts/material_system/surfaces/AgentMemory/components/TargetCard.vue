<template>
  <div class="am-card am-target-card">
    <div class="am-target-card__head">
      <MaterialIcon name="robot" :size="19" class="am-target-card__icon" />
      {{ target.runtime }}
    </div>
    <div class="am-target-card__path">{{ target.path }}</div>
    <span class="am-badge" :class="`am-badge--${target.status}`">{{ target.statusLabel }}</span>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'TargetCard',
  components: { MaterialIcon },
  props: {
    target: {
      type: Object,
      required: true,
    },
  },
};
</script>
