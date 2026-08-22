<template>
  <div
    class="material-login__alert"
    :class="`material-login__alert--${variant}`"
    :role="variant === 'error' ? 'alert' : 'status'"
    :aria-live="variant === 'error' ? 'assertive' : 'polite'"
  >
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AlertBanner',
  props: {
    variant: { type: String, default: 'error', validator: (value) => ['error', 'success'].includes(value) },
  },
};
</script>
