<template>
  <div class="material-login__remember-row">
    <label class="material-login__checkbox-label">
      <input
        type="checkbox"
        class="material-login__checkbox-input"
        :checked="value"
        @change="$emit('input', $event.target.checked)"
      />
      <span class="material-login__checkbox-box" :class="{ 'material-login__checkbox-box--checked': value }" aria-hidden="true">
        <Icon v-if="value" name="check" :size="15" color="var(--onprim)" />
      </span>
      <span class="material-login__checkbox-text">Remember me</span>
    </label>
    <a class="material-login__forgot-link" :href="forgotPasswordHref">Forgot password?</a>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'RememberMeRow',
  components: { Icon },
  props: {
    value: { type: Boolean, default: true },
    forgotPasswordHref: { type: String, required: true },
  },
};
</script>
