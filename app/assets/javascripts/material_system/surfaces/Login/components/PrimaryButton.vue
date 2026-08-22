<template>
  <button type="submit" class="material-login__submit" :disabled="disabled">
    <span v-if="loading" class="material-login__spinner" aria-hidden="true"></span>
    <slot />
  </button>
</template>

<script>
export default {
  name: 'PrimaryButton',
  props: {
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
};
</script>
