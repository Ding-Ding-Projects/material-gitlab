<template>
  <div class="am-sync-step">
    <MaterialIcon
      :name="step.icon"
      :size="18"
      class="am-sync-step__icon"
      :class="{ 'am-sync-step__icon--spin': step.active }"
    />
    {{ step.label }}
    <span class="am-sync-step__note">{{ step.note }}</span>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'SyncStepRow',
  components: { MaterialIcon },
  props: {
    step: {
      type: Object,
      required: true,
    },
  },
};
</script>
