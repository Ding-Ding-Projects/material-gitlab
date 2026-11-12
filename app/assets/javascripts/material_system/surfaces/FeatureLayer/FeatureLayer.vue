<script>
import { t } from '../../features/i18n';
import { rollDimSum, dimSumCount } from '../../features/dim-sum';
import notificationCenter from '../../notifications';
import SetupWizard from './SetupWizard.vue';
import MoreFeatures from './MoreFeatures.vue';
import LocksPanel from './LocksPanel.vue';
import UnlockPanel from './UnlockPanel.vue';
import SchedulesPanel from './SchedulesPanel.vue';

const HUB_TABS = [
  'setup',
  'language',
  'accessibility',
  'adhd',
  'dimsum',
  'notifications',
  'school',
  'wording',
  'name',
  'color',
  'extensions',
  'schedules',
  'locks',
  'export',
];
const MORE_TABS = ['school', 'wording', 'name', 'color', 'extensions'];

// Page-wide Material features: the bottom features rail, the feature hub (setup wizard,
// language, accessibility, ADHD modes, dim sum, notification centre, School mode, personal
// wording, display name, seed color, extensions, export), the dim sum
// surprise and the Momentum mode on the To-Do List.
export default {
  name: 'MaterialFeatureLayer',
  components: { SetupWizard, MoreFeatures, LocksPanel, UnlockPanel, SchedulesPanel },
  props: {
    feature: { type: Object, required: true },
    notifications: { type: Object, default: () => notificationCenter },
    random: { type: Function, default: Math.random },
    autoSetup: { type: Boolean, default: true },
  },
  data() {
    return {
      dish: null,
      dishImageFailed: false,
      dimSumNotice: '',
      inbox: this.notifications.review(),
      exportUrl: '',
      locksView: 'locks',
    };
  },
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    tabs: () => HUB_TABS,
    moreTabs: () => MORE_TABS,
    dishCount: () => dimSumCount(),
  },
  created() {
    this.unsubscribe = this.notifications.subscribe(() => {
      this.inbox = this.notifications.review();
    });
  },
  mounted() {
    const blocked =
      Boolean(document.querySelector('.modal.show, [role="dialog"][aria-modal="true"]')) ||
      document.body?.dataset?.page?.startsWith('errors') ||
      this.s.school.enabled;
    if (this.autoSetup && !this.s.setup.completed && !this.s.setup.dismissed) {
      this.feature.openHub('setup');
    } else {
      this.dish = rollDimSum({ random: this.random, blocked });
    }
    this.stopExtensions = this.feature.startExtensions?.({
      doc: document,
      notify: () => this.notifications.notify({ title: this.t('shaCopied'), severity: 'success' }),
    });
    this.onClick = (event) => this.momentum(event);
    document.addEventListener('click', this.onClick, true);
  },
  beforeDestroy() {
    this.unsubscribe?.();
    this.stopExtensions?.();
    document.removeEventListener('click', this.onClick, true);
    if (this.exportUrl) URL.revokeObjectURL(this.exportUrl);
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    momentum(event) {
      if (!this.s.adhd.momentum) return;
      const button = event.target.closest?.('button');
      const item = button?.closest('[data-testid^="todo-item-"]');
      if (!item || !/mark as done/i.test(button.getAttribute('aria-label') || button.title || ''))
        return;
      const next = item.nextElementSibling;
      setTimeout(() => next?.querySelector('a, button')?.focus(), 400);
    },
    triedToDisableDimSum() {
      this.dimSumNotice = this.t('dimSumNiceTry');
    },
    downloadExport() {
      if (this.exportUrl) URL.revokeObjectURL(this.exportUrl);
      this.exportUrl = URL.createObjectURL(
        new Blob([this.feature.exportJson()], { type: 'application/json' }),
      );
      this.$nextTick(() => this.$refs.exportLink?.click());
    },
    onHubKeydown(event) {
      if (event.key === 'Escape') this.feature.closeHub();
    },
    onUnlocked() {
      const href = this.s.unlockRequest?.href;
      this.feature.clearUnlockRequest();
      if (href) window.location.assign(href);
    },
    openTickets() {
      this.feature.clearUnlockRequest();
      this.locksView = 'tickets';
      this.feature.openHub('locks');
    },
    finishSetup() {
      this.feature.closeHub();
      this.$nextTick(() =>
        document.querySelector('#content-body, main, .content-wrapper')?.focus?.(),
      );
    },
  },
};
</script>
<template>
  <div class="m3-feature-layer" data-testid="feature-layer">
    <nav class="m3-rail" :aria-label="t('features')" data-testid="features-rail">
      <button type="button" class="m3-rail__item" @click="feature.openHub('language')">
        EN
        <span class="m3-dial" :aria-label="`${t('funnyEnglish')} ${s.settings.funnyLevelEnglish}`"
          ><i v-for="n in 5" :key="n" :class="{ on: n <= s.settings.funnyLevelEnglish }"></i
        ></span>
        粵
        <span
          class="m3-dial"
          :aria-label="`${t('funnyCantonese')} ${s.settings.funnyLevelCantonese}`"
          ><i v-for="n in 5" :key="n" :class="{ on: n <= s.settings.funnyLevelCantonese }"></i
        ></span>
      </button>
      <button type="button" class="m3-rail__item" @click="feature.openHub('accessibility')">
        {{ t('accessibility') }}
      </button>
      <button type="button" class="m3-rail__item" @click="feature.openHub('adhd')">
        {{ t('adhdModes') }}
      </button>
      <button type="button" class="m3-rail__item" @click="feature.openHub('notifications')">
        {{ t('notifications') }} <span class="m3-rail__count">{{ inbox.length }}</span>
      </button>
      <button type="button" class="m3-rail__item" @click="feature.openHub('export')">
        <span
          class="m3-swatch"
          :style="{ background: s.settings.accentColor }"
          aria-hidden="true"
        ></span
        >{{ s.settings.accentColor }}
      </button>
      <span class="m3-rail__spacer"></span>
      <span class="m3-rail__item m3-rail__item--static"
        ><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>F</kbd></span
      >
      <button type="button" class="m3-rail__item" @click="feature.openHub('dimsum')">
        dim sum 1/10
      </button>
      <button
        type="button"
        class="m3-rail__item m3-rail__item--primary"
        data-testid="open-feature-hub"
        @click="feature.openHub('setup')"
      >
        {{ t('features') }}
      </button>
    </nav>

    <aside
      v-if="dish"
      class="m3-dimsum"
      role="status"
      aria-live="polite"
      data-testid="dim-sum-card"
    >
      <div class="m3-dimsum__photo">
        <img
          v-if="!dishImageFailed"
          :src="dish.image"
          :alt="lang === 'yue' ? dish.altYue : dish.altEn"
          loading="lazy"
          @error="dishImageFailed = true"
        />
        <span v-else class="m3-dimsum__placeholder">{{ t('dimSumImageUnavailable') }}</span>
      </div>
      <div class="m3-dimsum__copy">
        <small>{{ t('dimSumHello') }}</small>
        <strong>{{ dish.en }}</strong>
        <span lang="zh-Hant-HK">{{ dish.zh }}</span>
      </div>
      <button
        type="button"
        class="m3-icon-btn"
        :aria-label="t('close')"
        data-testid="dim-sum-close"
        @click="dish = null"
      >
        ×
      </button>
    </aside>

    <div
      v-if="s.unlockRequest && !s.hubOpen"
      class="m3-hub-scrim"
      @click.self="feature.clearUnlockRequest()"
    >
      <section
        class="m3-hub"
        role="dialog"
        aria-modal="true"
        :aria-label="t('unlock')"
        data-testid="unlock-dialog"
        @keydown.esc="feature.clearUnlockRequest()"
      >
        <header class="m3-hub__head">
          <h2>{{ t('locked') }}</h2>
          <button
            type="button"
            class="m3-icon-btn"
            :aria-label="t('close')"
            @click="feature.clearUnlockRequest()"
          >
            ×
          </button>
        </header>
        <div class="m3-hub__body">
          <unlock-panel
            :feature="feature"
            :target="s.unlockRequest.target"
            @unlocked="onUnlocked"
            @tickets="openTickets"
          />
        </div>
      </section>
    </div>

    <div v-if="s.hubOpen" class="m3-hub-scrim" @click.self="feature.closeHub()">
      <section
        class="m3-hub"
        role="dialog"
        aria-modal="true"
        :aria-label="t('features')"
        data-testid="feature-hub"
        @keydown="onHubKeydown"
      >
        <header class="m3-hub__head">
          <h2>{{ t('features') }}</h2>
          <button
            type="button"
            class="m3-icon-btn"
            :aria-label="t('close')"
            data-testid="feature-hub-close"
            @click="feature.closeHub()"
          >
            ×
          </button>
        </header>
        <div class="m3-hub__tabs" role="tablist" aria-orientation="horizontal">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            role="tab"
            :aria-selected="String(s.hubTab === tab)"
            :class="{ 'is-on': s.hubTab === tab }"
            :data-testid="`hub-tab-${tab}`"
            @click="s.hubTab = tab"
          >
            {{
              t(
                {
                  setup: 'setup',
                  language: 'language',
                  accessibility: 'accessibility',
                  adhd: 'adhdModes',
                  dimsum: 'dimSum',
                  notifications: 'notificationCentre',
                  school: 'schoolMode',
                  wording: 'wording',
                  name: 'nameLogo',
                  color: 'color',
                  extensions: 'extensions',
                  schedules: 'schedules',
                  locks: 'locks',
                  export: 'exportSettings',
                }[tab],
              )
            }}
          </button>
        </div>
        <p v-if="s.error" class="m3-hub__error" role="alert">{{ t(s.error) }}</p>

        <div class="m3-hub__body" role="tabpanel">
          <unlock-panel
            v-if="feature.isLocked(`hub:${s.hubTab}`)"
            :key="`hub:${s.hubTab}`"
            :feature="feature"
            :target="`hub:${s.hubTab}`"
            @tickets="openTickets"
          />

          <setup-wizard v-else-if="s.hubTab === 'setup'" :feature="feature" @finish="finishSetup" />

          <locks-panel
            v-else-if="s.hubTab === 'locks'"
            :key="locksView"
            :feature="feature"
            :view="locksView"
          />

          <schedules-panel v-else-if="s.hubTab === 'schedules'" :feature="feature" />

          <more-features
            v-else-if="moreTabs.includes(s.hubTab)"
            :feature="feature"
            :tab="s.hubTab"
          />

          <template v-else-if="s.hubTab === 'language'">
            <div class="m3-field">
              <span class="m3-field__label">{{ t('language') }}</span>
              <span class="m3-seg">
                <button
                  v-for="opt in ['en', 'yue', 'bilingual']"
                  :key="opt"
                  type="button"
                  :class="{ 'is-on': lang === opt }"
                  :aria-pressed="String(lang === opt)"
                  @click="feature.setSetting({ language: opt })"
                >
                  {{ t({ en: 'english', yue: 'cantonese', bilingual: 'both' }[opt]) }}
                </button>
              </span>
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
                step="1"
                :value="s.settings[key]"
                @change="feature.setSetting({ [key]: Number($event.target.value) })"
              />
              <small>{{ t('funnyHelp') }}</small>
            </label>
          </template>

          <template v-else-if="s.hubTab === 'accessibility'">
            <label
              v-for="name in ['highContrast', 'alwaysFocusRing', 'largerTargets']"
              :key="name"
              class="m3-field m3-field--row"
            >
              <span
                >{{ t(name === 'alwaysFocusRing' ? 'focusRing' : name) }}
                <small>{{
                  feature.isA11yDefault(name) ? t('defaultValue') : t('setByYou')
                }}</small></span
              >
              <input
                type="checkbox"
                role="switch"
                :checked="s.a11y[name]"
                @change="feature.setA11y(name, $event.target.checked)"
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
              <span>{{ t('accessibility') }}: {{ t('hideMenu') }}</span>
              <input
                type="checkbox"
                role="switch"
                data-testid="hub-a11y-menuHidden"
                :checked="s.a11y.menuHidden"
                @change="feature.setA11y('menuHidden', $event.target.checked)"
              />
            </label>
          </template>

          <template v-else-if="s.hubTab === 'adhd'">
            <p>{{ t('adhdIntro') }}</p>
            <label
              v-for="name in ['focus', 'lowStimulation', 'timeAwareness', 'oneThing', 'momentum']"
              :key="name"
              class="m3-field m3-field--row"
            >
              <span
                ><strong>{{ t(name) }}</strong
                ><small>{{ t(`${name}Help`) }}</small></span
              >
              <input
                type="checkbox"
                role="switch"
                :checked="s.adhd[name]"
                @change="feature.setAdhd(name, $event.target.checked)"
              />
            </label>
          </template>

          <template v-else-if="s.hubTab === 'dimsum'">
            <label class="m3-field m3-field--row">
              <span
                ><strong>{{ t('dimSum') }}</strong
                ><small>{{ t('dimSumAlwaysOn') }} ({{ dishCount }})</small></span
              >
              <input
                type="checkbox"
                role="switch"
                checked
                data-testid="dim-sum-switch"
                @click.prevent="triedToDisableDimSum"
              />
            </label>
            <p v-if="dimSumNotice" role="status" data-testid="dim-sum-notice">{{ dimSumNotice }}</p>
          </template>

          <template v-else-if="s.hubTab === 'notifications'">
            <p v-if="!inbox.length">{{ t('noNotifications') }}</p>
            <ul v-else class="m3-list">
              <li v-for="item in inbox" :key="item.id" class="m3-list__row">
                <strong>{{ item.title || item.message }}</strong>
                <small>{{ item.severity }} · {{ item.createdAt }}</small>
                <span v-if="item.title && item.message">{{ item.message }}</span>
              </li>
            </ul>
            <button v-if="inbox.length" type="button" class="m3-btn" @click="notifications.clear()">
              {{ t('clearAll') }}
            </button>
          </template>

          <template v-else-if="s.hubTab === 'export'">
            <p>{{ t('exportHelp') }}</p>
            <button
              type="button"
              class="m3-btn m3-btn--filled"
              data-testid="export-settings"
              @click="downloadExport"
            >
              {{ t('exportSettings') }}
            </button>
            <a
              v-if="exportUrl"
              ref="exportLink"
              class="sr-only"
              :href="exportUrl"
              download="material-gitlab-settings.json"
              >{{ t('exportSettings') }}</a
            >
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
