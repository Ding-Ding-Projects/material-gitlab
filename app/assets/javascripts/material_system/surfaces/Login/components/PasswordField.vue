<template>
  <label class="material-login__field" :for="inputId">
    <span class="material-login__field-label">Password</span>
    <span class="material-login__password-wrap">
      <input
        :id="inputId"
        class="material-login__input material-login__input--password"
        :type="revealed ? 'text' : 'password'"
        autocomplete="current-password"
        placeholder="••••••••"
        :value="value"
        @input="$emit('input', $event.target.value)"
      />
      <button
        type="button"
        class="material-login__reveal-toggle"
        :aria-pressed="revealed ? 'true' : 'false'"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="$emit('toggle-reveal')"
      >
        <Icon :name="revealed ? 'visibility_off' : 'visibility'" :size="18" />
      </button>
    </span>
  </label>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'PasswordField',
  components: { Icon },
  props: {
    value: { type: String, default: '' },
    revealed: { type: Boolean, default: false },
    inputId: { type: String, default: 'material-login-password' },
  },
};
</script>
