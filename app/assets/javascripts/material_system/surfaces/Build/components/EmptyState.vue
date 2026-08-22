<template>
  <div class="empty-state">
    <icon :name="icon" class="empty-state__icon" />
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <button v-if="actionLabel" type="button" class="btn btn--text" @click="$emit('action')">{{ actionLabel }}</button>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'BuildEmptyState',
  components: { Icon },
  props: {
    icon: { type: String, default: 'inbox' },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
  },
};
</script>
