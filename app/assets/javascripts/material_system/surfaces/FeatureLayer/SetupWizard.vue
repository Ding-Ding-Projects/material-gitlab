<script>
import { t } from '../../features/i18n';

const STEPS = [
  { id: 'language', title: 'setupTitleLanguage', optional: false },
  { id: 'appearance', title: 'setupTitleAppearance', optional: true },
  { id: 'access', title: 'setupTitleAccess', optional: true },
  { id: 'done', title: 'setupTitleDone', optional: false },
];

// First-run setup. Every step applies a real setting immediately, progress is saved on each
// move so it resumes where it stopped, optional steps can be skipped, and finishing opens
// the workspace.
export default {
  name: 'MaterialSetupWizard',
  props: { feature: { type: Object, required: true } },
  emits: ['finish'],
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    steps: () => STEPS,
    index() {
      return Math.min(Math.max(this.s.setup.step || 0, 0), STEPS.length - 1);
    },
    step() {
      return STEPS[this.index];
    },
  },
  mounted() {
    this.focusHeading();
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    focusHeading() {
      this.$nextTick(() => this.$refs.heading?.focus());
    },
    go(index, extra = {}) {
      this.feature.saveSetup({ step: index, ...extra });
      this.focusHeading();
    },
    next() {
      this.go(this.index + 1);
    },
    back() {
      this.go(this.index - 1);
    },
    skip() {
      this.go(this.index + 1, {
        skipped: [...new Set([...(this.s.setup.skipped || []), this.step.id])],
      });
    },
    later() {
      this.feature.saveSetup({ dismissed: true });
      this.$emit('finish');
    },
    finish() {
      this.feature.saveSetup({ completed: true, dismissed: false });
      this.$emit('finish');
    },
    setFontScale(value) {
      this.feature.setSetting({ fontScale: Number(value) });
    },
  },
};
</script>
<template>
  <div class="m3-wizard" data-testid="setup-wizard">
    <p class="m3-wizard__count">{{ t('stepOf', { n: index + 1, total: steps.length }) }}</p>
    <div
      class="m3-wizard__progress"
      role="progressbar"
      aria-valuemin="1"
      :aria-valuemax="steps.length"
      :aria-valuenow="index + 1"
    >
      <span
        v-for="(item, i) in steps"
        :key="item.id"
        :class="{ done: i < index, current: i === index }"
      ></span>
    </div>
    <h3 ref="heading" tabindex="-1" data-testid="setup-step-title">
      {{ t(step.title) }}
      <small v-if="step.optional">({{ t('optional') }})</small>
    </h3>

    <div v-if="step.id === 'language'" class="m3-wizard__body">
      <div class="m3-choice-grid">
        <button
          v-for="opt in ['en', 'yue', 'bilingual']"
          :key="opt"
          type="button"
          class="m3-choice"
          :class="{ 'is-on': lang === opt }"
          :aria-pressed="String(lang === opt)"
          :data-testid="`setup-language-${opt}`"
          @click="feature.setSetting({ language: opt })"
        >
          {{ t({ en: 'english', yue: 'cantonese', bilingual: 'both' }[opt]) }}
        </button>
      </div>
      <label
        v-for="key in ['funnyLevelEnglish', 'funnyLevelCantonese']"
        :key="key"
        class="m3-field"
      >
        <span class="m3-field__label"
          >{{ t(key === 'funnyLevelEnglish' ? 'funnyEnglish' : 'funnyCantonese') }}:
          {{ s.settings[key] }}</span
        >
        <input
          type="range"
          min="1"
          max="5"
          :value="s.settings[key]"
          @change="feature.setSetting({ [key]: Number($event.target.value) })"
        />
        <small>{{ t('funnyHelp') }}</small>
      </label>
    </div>

    <div v-else-if="step.id === 'appearance'" class="m3-wizard__body">
      <div class="m3-field">
        <span class="m3-field__label">{{ t('theme') }}</span>
        <span class="m3-seg">
          <button
            v-for="opt in ['light', 'dark', 'system']"
            :key="opt"
            type="button"
            :class="{ 'is-on': s.settings.theme === opt }"
            :aria-pressed="String(s.settings.theme === opt)"
            @click="feature.setSetting({ theme: opt })"
          >
            {{ t(opt) }}
          </button>
        </span>
      </div>
      <div class="m3-field">
        <span class="m3-field__label">{{ t('density') }}</span>
        <span class="m3-seg">
          <button
            v-for="opt in ['compact', 'comfortable', 'spacious']"
            :key="opt"
            type="button"
            :class="{ 'is-on': s.settings.density === opt }"
            :aria-pressed="String(s.settings.density === opt)"
            @click="feature.setSetting({ density: opt })"
          >
            {{ t(opt) }}
          </button>
        </span>
      </div>
      <label class="m3-field">
        <span class="m3-field__label">{{ t('seedColor') }}</span>
        <input
          type="color"
          :value="s.settings.accentColor.slice(0, 7)"
          data-testid="setup-seed"
          @change="feature.setSetting({ accentColor: $event.target.value })"
        />
      </label>
    </div>

    <div v-else-if="step.id === 'access'" class="m3-wizard__body">
      <label class="m3-field">
        <span class="m3-field__label"
          >{{ t('textSize') }}: {{ Math.round((s.settings.fontScale || 1) * 100) }}%</span
        >
        <input
          type="range"
          min="0.8"
          max="2"
          step="0.1"
          :value="s.settings.fontScale"
          @change="setFontScale($event.target.value)"
        />
      </label>
      <label class="m3-field m3-field--row">
        <span>{{ t('reduceMotion') }}</span>
        <input
          type="checkbox"
          role="switch"
          :checked="s.settings.motion === 'reduced'"
          @change="feature.setSetting({ motion: $event.target.checked ? 'reduced' : 'full' })"
        />
      </label>
      <label class="m3-field m3-field--row">
        <span>{{ t('highContrast') }}</span>
        <input
          type="checkbox"
          role="switch"
          :checked="s.a11y.highContrast"
          @change="feature.setA11y('highContrast', $event.target.checked)"
        />
      </label>
    </div>

    <div v-else class="m3-wizard__body">
      <p>{{ t('setupDoneBody') }}</p>
      <ul class="m3-list">
        <li class="m3-list__row">
          {{ t('language') }}: {{ t({ en: 'english', yue: 'cantonese', bilingual: 'both' }[lang]) }}
        </li>
        <li class="m3-list__row">
          {{ t('theme') }}: {{ t(s.settings.theme) }} · {{ t(s.settings.density) }} ·
          {{ s.settings.accentColor }}
        </li>
        <li class="m3-list__row">
          {{ t('textSize') }}: {{ Math.round((s.settings.fontScale || 1) * 100) }}%
        </li>
      </ul>
    </div>

    <div class="m3-wizard__actions">
      <button v-if="index > 0" type="button" class="m3-btn" data-testid="setup-back" @click="back">
        {{ t('back') }}
      </button>
      <span class="m3-wizard__spacer"></span>
      <button
        v-if="step.optional"
        type="button"
        class="m3-btn"
        data-testid="setup-skip"
        @click="skip"
      >
        {{ t('skip') }}
      </button>
      <button
        v-if="step.id !== 'done'"
        type="button"
        class="m3-btn m3-btn--outline"
        data-testid="setup-later"
        @click="later"
      >
        {{ t('saveLater') }}
      </button>
      <button
        v-if="step.id !== 'done'"
        type="button"
        class="m3-btn m3-btn--filled"
        data-testid="setup-next"
        @click="next"
      >
        {{ t('next') }}
      </button>
      <button
        v-else
        type="button"
        class="m3-btn m3-btn--filled"
        data-testid="setup-finish"
        @click="finish"
      >
        {{ t('finish') }}
      </button>
    </div>
  </div>
</template>
