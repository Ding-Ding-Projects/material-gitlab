<template>
  <div class="material-login" :data-theme="themeAttr">
    <div class="material-login__card">
      <BrandPanel :mark="brand.mark" :title="brand.title" :tagline="brand.tagline" />

      <form class="material-login__form" data-screen-label="Sign-in form" novalidate @submit.prevent="submit">
        <h1 class="material-login__heading">{{ heading }}</h1>

        <AlertBanner v-if="error" variant="error">{{ error }}</AlertBanner>

        <AlertBanner v-if="signedIn" variant="success">
          Signed in as {{ username }} — <a :href="links.continueTo">continue to Issues</a>
        </AlertBanner>

        <UsernameField :value="username" @input="setUsername" />

        <!-- Enter-to-submit comes free from the native <form>; no keydown wiring needed. -->
        <PasswordField
          :value="password"
          :revealed="revealPassword"
          @input="setPassword"
          @toggle-reveal="toggleReveal"
        />

        <RememberMeRow :value="remember" :forgot-password-href="links.forgotPassword" @input="setRemember" />

        <PrimaryButton :loading="submitting" :disabled="submitting">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </PrimaryButton>

        <DividerRow label="or" />

        <AlternateAuthOptions :providers="authProviders" @select="handleProviderSelect" />

        <RegisterPrompt :register-href="links.register" />
      </form>
    </div>
  </div>
</template>

<script>
import BrandPanel from './components/BrandPanel.vue';
import AlertBanner from './components/AlertBanner.vue';
import UsernameField from './components/UsernameField.vue';
import PasswordField from './components/PasswordField.vue';
import RememberMeRow from './components/RememberMeRow.vue';
import PrimaryButton from './components/PrimaryButton.vue';
import DividerRow from './components/DividerRow.vue';
import AlternateAuthOptions from './components/AlternateAuthOptions.vue';
import RegisterPrompt from './components/RegisterPrompt.vue';
import { loadSettings, subscribeSettings } from '../../settings';
import notificationCenter from '../../notifications';
import {
  DEFAULT_HEADING,
  BRAND_CONTENT,
  AUTH_PROVIDERS,
  DEFAULT_LINKS,
  createInitialState,
  authenticate as defaultAuthenticate,
} from './data';

export default {
  name: 'Login',
  components: {
    BrandPanel,
    AlertBanner,
    UsernameField,
    PasswordField,
    RememberMeRow,
    PrimaryButton,
    DividerRow,
    AlternateAuthOptions,
    RegisterPrompt,
  },
  props: {
    heading: { type: String, default: DEFAULT_HEADING },
    brand: { type: Object, default: () => BRAND_CONTENT },
    authProviders: { type: Array, default: () => AUTH_PROVIDERS },
    links: { type: Object, default: () => DEFAULT_LINKS },
    // Swap in a real backend call: (creds) => Promise<{ ok, error, redirectTo? }>
    authenticate: { type: Function, default: defaultAuthenticate },
    // Optional standalone notification centre override, for host-app wiring/tests.
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return { ...createInitialState(), themeAttr: this.resolveThemeAttr() };
  },
  created() {
    this.unsubscribeSettings = subscribeSettings(() => {
      this.themeAttr = this.resolveThemeAttr();
    });
  },
  beforeDestroy() {
    if (this.unsubscribeSettings) this.unsubscribeSettings();
  },
  methods: {
    resolveThemeAttr() {
      const { theme } = loadSettings();
      return theme === 'light' || theme === 'dark' ? theme : undefined;
    },
    setUsername(value) {
      this.username = value;
      this.error = null;
    },
    setPassword(value) {
      this.password = value;
      this.error = null;
    },
    setRemember(value) {
      this.remember = value;
    },
    toggleReveal() {
      this.revealPassword = !this.revealPassword;
    },
    handleProviderSelect(provider) {
      this.notifications.notify({
        title: provider.label,
        message: `Redirecting to ${provider.label} sign-in…`,
        severity: 'info',
        timeout: 3000,
      });
      this.$emit('provider-select', provider);
    },
    async submit() {
      if (this.submitting) return;
      if (!this.username.trim() || !this.password) {
        this.error = 'Enter a username and password.';
        this.signedIn = false;
        return;
      }
      this.submitting = true;
      try {
        const result = await this.authenticate({
          username: this.username,
          password: this.password,
          remember: this.remember,
        });
        if (!result || !result.ok) {
          this.error = (result && result.error) || 'Sign-in failed. Check your credentials and try again.';
          this.signedIn = false;
          this.notifications.notify({ title: 'Sign-in failed', message: this.error, severity: 'error' });
          return;
        }
        this.error = null;
        if (result.redirectTo) {
          window.location.assign(result.redirectTo);
          return;
        }
        this.signedIn = true;
        this.$emit('signed-in', { username: this.username, remember: this.remember });
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style lang="scss" src="./login.scss"></style>
