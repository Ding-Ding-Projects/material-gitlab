<template>
  <label class="material-login__field" :for="inputId">
    <span class="material-login__field-label">Username or email</span>
    <input
      :id="inputId"
      class="material-login__input"
      type="text"
      autocomplete="username"
      autocapitalize="none"
      spellcheck="false"
      placeholder="jdoe@acme.dev"
      :value="value"
      @input="$emit('input', $event.target.value)"
    />
  </label>
</template>

<script>
export default {
  name: 'UsernameField',
  props: {
    value: { type: String, default: '' },
    inputId: { type: String, default: 'material-login-username' },
  },
};
</script>
