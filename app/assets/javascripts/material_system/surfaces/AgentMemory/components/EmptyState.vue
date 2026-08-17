<template>
  <div class="am-empty" role="status">
    <MaterialIcon :name="icon" :size="28" class="am-empty__icon" />
    <p class="am-empty__message">{{ message }}</p>
    <button v-if="actionLabel" type="button" class="am-btn am-btn--text" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'EmptyState',
  components: { MaterialIcon },
  props: {
    message: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'search',
    },
    actionLabel: {
      type: String,
      default: '',
    },
  },
};
</script>
