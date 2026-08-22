<template>
  <p class="material-login__register">New here? <a :href="registerHref">Register now</a></p>
</template>

<script>
export default {
  name: 'RegisterPrompt',
  props: {
    registerHref: { type: String, required: true },
  },
};
</script>
