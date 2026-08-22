<template>
  <div class="material-login__oauth">
    <a
      v-for="provider in providers"
      :key="provider.id"
      class="material-login__oauth-option"
      :href="provider.href"
      @click="$emit('select', provider)"
    >
      <Icon :name="provider.icon" :size="18" />
      {{ provider.label }}
    </a>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'AlternateAuthOptions',
  components: { Icon },
  props: {
    providers: { type: Array, required: true },
  },
};
</script>
