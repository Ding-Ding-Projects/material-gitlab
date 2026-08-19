<template>
  <div class="material-login__divider">
    <span class="material-login__divider-line" aria-hidden="true"></span>
    <span class="material-login__divider-label">{{ label }}</span>
    <span class="material-login__divider-line" aria-hidden="true"></span>
  </div>
</template>

<script>
export default {
  name: 'DividerRow',
  props: {
    label: { type: String, default: 'or' },
  },
};
</script>
