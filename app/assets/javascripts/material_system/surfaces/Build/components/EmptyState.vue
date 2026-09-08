<template>
  <div class="empty-state">
    <icon :name="icon" class="empty-state__icon" />
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <material-button v-if="actionLabel" type="button" variant="text" class="btn btn--text" @click="$emit('action')">{{ actionLabel }}</material-button>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import MaterialButton from '../../../components/material_button';

export default {
  name: 'BuildEmptyState',
  components: { Icon, MaterialButton },
  props: {
    icon: { type: String, default: 'inbox' },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
  },
};
</script>
