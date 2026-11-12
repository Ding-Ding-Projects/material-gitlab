<script>
import { t } from '../../features/i18n';

const DAYS = [
  [1, 'Mon', '一'],
  [2, 'Tue', '二'],
  [3, 'Wed', '三'],
  [4, 'Thu', '四'],
  [5, 'Fri', '五'],
  [6, 'Sat', '六'],
  [0, 'Sun', '日'],
];

// Scheduled settings: rules that switch language, density, seed color or motion during a time
// window on chosen weekdays, shown as active or waiting.
export default {
  name: 'MaterialSchedulesPanel',
  props: { feature: { type: Object, required: true } },
  data() {
    return {
      label: '',
      startTime: '22:00',
      endTime: '07:00',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      setting: 'motion',
      value: 'reduced',
      error: '',
    };
  },
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    days: () => DAYS,
    options() {
      return {
        language: ['en', 'yue', 'bilingual'],
        density: ['compact', 'comfortable', 'spacious'],
        motion: ['full', 'reduced'],
        accentColor: null,
      }[this.setting];
    },
  },
  watch: {
    setting() {
      this.value = this.options ? this.options[0] : '#FC6D26';
    },
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    dayName([, en, yue]) {
      return this.lang === 'yue' ? yue : en;
    },
    toggleDay(day) {
      this.weekdays = this.weekdays.includes(day)
        ? this.weekdays.filter((d) => d !== day)
        : [...this.weekdays, day];
    },
    add() {
      const result = this.feature.addRule({
        label: this.label.trim(),
        startTime: this.startTime,
        endTime: this.endTime,
        weekdays: [...this.weekdays].sort(),
        values: {
          [this.setting]: this.setting === 'accentColor' ? this.value.toUpperCase() : this.value,
        },
      });
      this.error = result.ok ? '' : this.t('ruleInvalid');
      if (result.ok) this.label = '';
    },
    summary(rule) {
      return Object.entries(rule.values)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    },
  },
};
</script>
<template>
  <div class="m3-schedules" data-testid="schedules-panel">
    <p>{{ t('schedulesHelp') }}</p>
    <ul v-if="s.rules.length" class="m3-list">
      <li v-for="rule in s.rules" :key="rule.id" class="m3-field m3-field--row">
        <span>
          <strong>{{ rule.label }}</strong>
          <small>
            {{ rule.startTime }}–{{ rule.endTime }} ·
            {{
              days
                .filter((d) => rule.weekdays.includes(d[0]))
                .map(dayName)
                .join(' ')
            }}
            · {{ summary(rule) }} ·
            <b :data-testid="`rule-state-${rule.label}`">{{
              s.matchedRules.includes(rule.id) ? t('active') : t('waiting')
            }}</b>
          </small>
        </span>
        <input
          type="checkbox"
          role="switch"
          :aria-label="rule.label"
          :checked="rule.enabled"
          @change="feature.toggleRule(rule.id, $event.target.checked)"
        />
        <button type="button" class="m3-btn" @click="feature.removeRule(rule.id)">
          {{ t('remove') }}
        </button>
      </li>
    </ul>
    <p v-else>{{ t('noRules') }}</p>

    <form class="m3-schedule-form" @submit.prevent="add">
      <label class="m3-field"
        ><span class="m3-field__label">{{ t('ruleLabel') }}</span
        ><input v-model="label" class="m3-input" maxlength="120" data-testid="rule-label"
      /></label>
      <label class="m3-field"
        ><span class="m3-field__label">{{ t('from') }}</span
        ><input v-model="startTime" class="m3-input" type="time" data-testid="rule-start"
      /></label>
      <label class="m3-field"
        ><span class="m3-field__label">{{ t('until') }}</span
        ><input v-model="endTime" class="m3-input" type="time" data-testid="rule-end"
      /></label>
      <fieldset class="m3-field">
        <legend class="m3-field__label">{{ t('days') }}</legend>
        <span class="m3-seg">
          <button
            v-for="day in days"
            :key="day[0]"
            type="button"
            :class="{ 'is-on': weekdays.includes(day[0]) }"
            :aria-pressed="String(weekdays.includes(day[0]))"
            @click="toggleDay(day[0])"
          >
            {{ dayName(day) }}
          </button>
        </span>
      </fieldset>
      <label class="m3-field">
        <span class="m3-field__label">{{ t('sets') }}</span>
        <select v-model="setting" class="m3-input" data-testid="rule-setting">
          <option value="motion">motion</option>
          <option value="language">language</option>
          <option value="density">density</option>
          <option value="accentColor">accentColor</option>
        </select>
      </label>
      <label class="m3-field">
        <span class="sr-only">{{ t('sets') }}</span>
        <select v-if="options" v-model="value" class="m3-input" data-testid="rule-value">
          <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <input v-else v-model="value" class="m3-input" type="color" />
      </label>
      <p v-if="error" class="m3-hub__error" role="alert">{{ error }}</p>
      <button type="submit" class="m3-btn m3-btn--filled" data-testid="rule-add">
        {{ t('addRule') }}
      </button>
    </form>
  </div>
</template>
