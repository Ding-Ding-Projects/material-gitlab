<script>
import { t } from '../../features/i18n';
import { SHIPPED_NAME } from '../../features/state';
import { logoFileToPng, LOGO_ACCEPT } from '../../features/logo-file';

const hexToRgb = (hex) => {
  const value = hex.replace('#', '').slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
};
const rgbToHsl = ([r, g, b]) => {
  const [rn, gn, bn] = [r, g, b].map((v) => v / 255);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
};
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Hub tabs for School mode, personal wording, display name, the seed color translator and
// the built-in extensions manager.
export default {
  name: 'MaterialMoreFeatures',
  props: {
    feature: { type: Object, required: true },
    tab: { type: String, required: true },
  },
  data() {
    return {
      pin: '',
      schoolError: '',
      wordingResult: '',
      wordingErrors: [],
      nameDraft: this.feature.state.displayName,
      hexDraft: this.feature.state.settings.accentColor.slice(0, 7),
      extensionQuery: '',
      logoError: '',
    };
  },
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    rgb() {
      return hexToRgb(this.s.settings.accentColor);
    },
    hsl() {
      return rgbToHsl(this.rgb);
    },
    contrast() {
      const l = luminance(this.rgb);
      return Math.round((1.05 / (l + 0.05)) * 100) / 100;
    },
    extensionsShown() {
      const needle = this.extensionQuery.toLocaleLowerCase();
      return this.s.extensions.filter((ext) =>
        `${ext.name} ${ext.permissions.join(' ')}`.toLocaleLowerCase().includes(needle),
      );
    },
    shippedName: () => SHIPPED_NAME,
    logoAccept: () => LOGO_ACCEPT.join(','),
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    async toggleSchool() {
      const result = this.s.school.enabled
        ? await this.feature.disableSchool(this.pin)
        : await this.feature.enableSchool(this.pin);
      this.schoolError = result.ok ? '' : this.t(result.reason);
      this.pin = '';
    },
    async onWordingFile(event) {
      const [file] = event.target.files || [];
      if (!file) return;
      const result = this.feature.loadWording(await file.text());
      this.wordingErrors = result.ok ? [] : result.errors || [];
      this.wordingResult = result.ok ? this.t('wordingLoaded', { n: result.entryCount }) : '';
      event.target.value = '';
    },
    clearWording() {
      this.feature.clearWording();
      this.wordingResult = '';
      this.wordingErrors = [];
    },
    async onLogoFile(event) {
      const [file] = event.target.files || [];
      event.target.value = '';
      if (!file) return;
      const result = await logoFileToPng(file);
      this.logoError = result.ok ? '' : this.t('logoFailed');
      if (result.ok) this.feature.setLogo(result.dataUrl);
    },
    applyHex() {
      const value = this.hexDraft.trim();
      if (/^#[0-9a-f]{6}$/i.test(value))
        this.feature.setSetting({ accentColor: value.toUpperCase() });
    },
  },
};
</script>
<template>
  <div class="m3-more" :data-testid="`more-${tab}`">
    <template v-if="tab === 'school'">
      <p>{{ t('schoolHelp') }}</p>
      <p v-if="s.school.enabled" class="m3-chip m3-chip--time" role="status">{{ t('schoolOn') }}</p>
      <label class="m3-field">
        <span class="m3-field__label">{{ s.school.enabled ? t('enterPin') : t('setPin') }}</span>
        <input
          v-model="pin"
          class="m3-input"
          type="password"
          inputmode="numeric"
          autocomplete="off"
          data-testid="school-pin"
        />
      </label>
      <p v-if="schoolError" role="alert" class="m3-hub__error" data-testid="school-error">
        {{ schoolError }}
      </p>
      <button
        type="button"
        class="m3-btn m3-btn--filled"
        data-testid="school-toggle"
        @click="toggleSchool"
      >
        {{ s.school.enabled ? t('turnOff') : t('turnOn') }}
      </button>
    </template>

    <template v-else-if="tab === 'wording'">
      <p>{{ t('wordingHelp') }}</p>
      <p role="status" data-testid="wording-status">
        {{
          s.wording.status === 'loaded'
            ? t('wordingLoaded', { n: s.wording.entryCount })
            : t('wordingEmpty')
        }}
      </p>
      <p v-if="wordingResult" class="m3-celebrate" role="status">{{ wordingResult }}</p>
      <ul v-if="wordingErrors.length" class="m3-hub__error" role="alert">
        <li v-for="error in wordingErrors.slice(0, 5)" :key="error">{{ error }}</li>
      </ul>
      <label class="m3-btn m3-btn--outline m3-file">
        {{ t('upload') }}
        <input
          type="file"
          accept="application/json,.json"
          class="sr-only"
          data-testid="wording-file"
          @change="onWordingFile"
        />
      </label>
      <button
        type="button"
        class="m3-btn"
        :disabled="s.wording.status !== 'loaded'"
        @click="clearWording"
      >
        {{ t('clear') }}
      </button>
    </template>

    <template v-else-if="tab === 'name'">
      <label class="m3-field">
        <span class="m3-field__label">{{ t('displayName') }}</span>
        <input
          v-model="nameDraft"
          class="m3-input"
          maxlength="80"
          data-testid="display-name"
          @keydown.enter="feature.rename(nameDraft)"
        />
        <small
          >{{ t('displayNameHelp') }} ({{
            s.displayName === shippedName ? t('defaultValue') : t('setByYou')
          }})</small
        >
      </label>
      <button
        type="button"
        class="m3-btn m3-btn--filled"
        data-testid="display-name-save"
        @click="feature.rename(nameDraft)"
      >
        {{ t('saved') }}
      </button>
      <button type="button" class="m3-btn" @click="(feature.rename(''), (nameDraft = shippedName))">
        {{ t('reset') }}
      </button>
      <h3>{{ t('logo') }}</h3>
      <div class="m3-logo-row">
        <img
          v-if="s.logo"
          class="m3-logo-preview"
          :src="s.logo"
          :alt="t('logo')"
          data-testid="logo-preview"
        />
        <span v-else class="m3-logo-preview m3-logo-preview--default" aria-hidden="true">m/</span>
        <label class="m3-btn m3-btn--outline m3-file">
          {{ t('uploadLogo') }}
          <input
            type="file"
            :accept="logoAccept"
            class="sr-only"
            data-testid="logo-file"
            @change="onLogoFile"
          />
        </label>
        <button
          v-if="s.logo"
          type="button"
          class="m3-btn"
          data-testid="logo-reset"
          @click="feature.clearLogo()"
        >
          {{ t('reset') }}
        </button>
      </div>
      <small>{{ t('logoHelp') }}</small>
      <p v-if="logoError" class="m3-hub__error" role="alert">{{ logoError }}</p>
    </template>

    <template v-else-if="tab === 'color'">
      <p>{{ t('colorHelp') }}</p>
      <div class="m3-color">
        <input
          type="color"
          :value="s.settings.accentColor.slice(0, 7)"
          :aria-label="t('seedColor')"
          @input="
            (feature.setSetting({ accentColor: $event.target.value.toUpperCase() }),
            (hexDraft = $event.target.value))
          "
        />
        <label class="m3-field"
          ><span class="m3-field__label">HEX</span
          ><input v-model="hexDraft" class="m3-input" data-testid="color-hex" @change="applyHex"
        /></label>
        <p class="m3-mono" data-testid="color-rgb">rgb({{ rgb.join(', ') }})</p>
        <p class="m3-mono" data-testid="color-hsl">hsl({{ hsl[0] }} {{ hsl[1] }}% {{ hsl[2] }}%)</p>
        <p data-testid="color-contrast">
          {{ t('contrast') }}: {{ contrast }}:1,
          {{ contrast >= 4.5 ? t('contrastOk') : t('contrastLow') }}
        </p>
      </div>
    </template>

    <template v-else-if="tab === 'extensions'">
      <p>{{ t('extensionsHelp') }}</p>
      <label class="m3-field">
        <span class="sr-only">{{ t('searchExtensions') }}</span>
        <input
          v-model="extensionQuery"
          class="m3-input"
          type="search"
          :placeholder="t('searchExtensions')"
          data-testid="extensions-search"
        />
      </label>
      <ul class="m3-list">
        <li v-for="ext in extensionsShown" :key="ext.id" class="m3-field m3-field--row">
          <span>
            <strong>{{ ext.name }}</strong>
            <small
              >v{{ ext.version }} · {{ t('permissions') }}: {{ ext.permissions.join('; ') }}</small
            >
          </span>
          <input
            type="checkbox"
            role="switch"
            :aria-label="ext.name"
            :data-testid="`extension-${ext.id}`"
            :checked="ext.enabled"
            @change="feature.setExtension(ext.id, $event.target.checked)"
          />
        </li>
      </ul>
    </template>
  </div>
</template>
