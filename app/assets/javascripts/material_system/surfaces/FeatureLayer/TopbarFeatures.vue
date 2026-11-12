<script>
import { t } from '../../features/i18n';

const ADHD = ['focus', 'lowStimulation', 'timeAwareness', 'oneThing', 'momentum'];
const pad = (n) => String(n).padStart(2, '0');

// Top bar controls from the design: language toggle, the always visible accessibility tools
// menu, ADHD modes, and the elapsed-time and "what's next" chips those modes switch on.
export default {
  name: 'MaterialTopbarFeatures',
  props: {
    feature: { type: Object, required: true },
    todosHref: { type: String, default: '/dashboard/todos' },
  },
  data() {
    return { menu: null, now: Date.now(), timer: null };
  },
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    elapsed() {
      const seconds = Math.max(0, Math.floor((this.now - this.s.pageLoadedAt) / 1000));
      return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
    },
    adhdKeys: () => ADHD,
  },
  watch: {
    's.adhd.timeAwareness': {
      immediate: true,
      handler(on) {
        clearInterval(this.timer);
        this.timer = on ? setInterval(() => (this.now = Date.now()), 1000) : null;
      },
    },
  },
  mounted() {
    this.onDocClick = (event) => {
      if (this.menu && !this.$el.contains(event.target)) this.menu = null;
    };
    document.addEventListener('click', this.onDocClick);
  },
  beforeDestroy() {
    clearInterval(this.timer);
    document.removeEventListener('click', this.onDocClick);
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    toggle(name) {
      this.menu = this.menu === name ? null : name;
      if (this.menu)
        this.$nextTick(() => this.$refs[`${name}Menu`]?.querySelector('button, input')?.focus());
    },
    onMenuKeydown(event) {
      if (event.key === 'Escape') {
        const name = this.menu;
        this.menu = null;
        this.$nextTick(() => this.$refs[`${name}Button`]?.focus());
      }
    },
    setFontScale(delta) {
      const next =
        Math.round(Math.min(2, Math.max(0.8, (this.s.settings.fontScale || 1) + delta)) * 10) / 10;
      this.feature.setSetting({ fontScale: next });
    },
  },
};
</script>
<template>
  <div class="m3-features-topbar" data-testid="topbar-features">
    <div class="m3-seg" role="radiogroup" :aria-label="t('language')">
      <button
        v-for="option in [
          ['en', 'EN'],
          ['yue', '粵'],
          ['bilingual', 'EN+粵'],
        ]"
        :key="option[0]"
        type="button"
        role="radio"
        :aria-checked="String(lang === option[0])"
        :class="{ 'is-on': lang === option[0] }"
        :data-testid="`language-${option[0]}`"
        @click="feature.setSetting({ language: option[0] })"
      >
        {{ option[1] }}
      </button>
    </div>

    <span
      v-if="s.adhd.timeAwareness"
      class="m3-chip m3-chip--time"
      role="timer"
      :aria-label="t('elapsed')"
      data-testid="adhd-timer"
    >
      {{ elapsed }}
    </span>
    <a
      v-if="s.adhd.oneThing"
      class="m3-chip m3-chip--next"
      :href="todosHref"
      data-testid="adhd-next"
    >
      {{ t('whatsNext') }}
    </a>

    <div v-if="!s.a11y.menuHidden" class="m3-menu-anchor" @keydown="onMenuKeydown">
      <button
        ref="a11yButton"
        type="button"
        class="m3-a11y-button"
        aria-haspopup="true"
        :aria-expanded="String(menu === 'a11y')"
        data-testid="a11y-button"
        @click="toggle('a11y')"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{{ t('accessibility') }}</span>
      </button>
      <div
        v-if="menu === 'a11y'"
        ref="a11yMenu"
        class="m3-popover"
        role="group"
        :aria-label="t('accessibility')"
        data-testid="a11y-menu"
      >
        <div class="m3-popover__row">
          <span>{{ t('textSize') }}</span>
          <span class="m3-seg m3-seg--small">
            <button type="button" :aria-label="t('smaller')" @click="setFontScale(-0.1)">A−</button>
            <span class="m3-seg__value" aria-live="polite"
              >{{ Math.round((s.settings.fontScale || 1) * 100) }}%</span
            >
            <button type="button" :aria-label="t('larger')" @click="setFontScale(0.1)">A+</button>
          </span>
        </div>
        <label class="m3-popover__row">
          <span>{{ t('reduceMotion') }}</span>
          <input
            type="checkbox"
            role="switch"
            :checked="s.settings.motion === 'reduced'"
            @change="feature.setSetting({ motion: $event.target.checked ? 'reduced' : 'full' })"
          />
        </label>
        <label
          v-for="name in ['highContrast', 'alwaysFocusRing', 'largerTargets']"
          :key="name"
          class="m3-popover__row"
        >
          <span>{{ t(name === 'alwaysFocusRing' ? 'focusRing' : name) }}</span>
          <input
            type="checkbox"
            role="switch"
            :data-testid="`a11y-${name}`"
            :checked="s.a11y[name]"
            @change="feature.setA11y(name, $event.target.checked)"
          />
        </label>
        <button
          type="button"
          class="m3-popover__row m3-popover__link"
          @click="feature.setA11y('menuHidden', true)"
        >
          <span>{{ t('hideMenu') }}</span><small>{{ t('hideMenuHint') }}</small>
        </button>
      </div>
    </div>

    <div class="m3-menu-anchor" @keydown="onMenuKeydown">
      <button
        ref="adhdButton"
        type="button"
        class="m3-icon-btn"
        :class="{ 'is-on': adhdKeys.some((k) => s.adhd[k]) }"
        aria-haspopup="true"
        :aria-expanded="String(menu === 'adhd')"
        :aria-label="t('adhdModes')"
        data-testid="adhd-button"
        @click="toggle('adhd')"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <div
        v-if="menu === 'adhd'"
        ref="adhdMenu"
        class="m3-popover m3-popover--wide"
        role="group"
        :aria-label="t('adhdModes')"
        data-testid="adhd-menu"
      >
        <p class="m3-popover__intro">{{ t('adhdIntro') }}</p>
        <label v-for="name in adhdKeys" :key="name" class="m3-popover__row m3-popover__row--tall">
          <span>
            <strong>{{ t(name) }}</strong>
            <small>{{ t(`${name}Help`) }}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            :data-testid="`adhd-${name}`"
            :checked="s.adhd[name]"
            @change="feature.setAdhd(name, $event.target.checked)"
          />
        </label>
      </div>
    </div>
  </div>
</template>
