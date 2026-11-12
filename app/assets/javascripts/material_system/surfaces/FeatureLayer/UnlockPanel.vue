<script>
import { t } from '../../features/i18n';
import { makeChallenge, LADDER_RUNGS } from '../../features/locks';
import { DIM_SUM_DISHES } from '../../features/dim-sum-catalog';

const RUNG_TITLES = {
  dimsum: 'rungDimsum',
  sums: 'rungSums',
  moles: 'rungMoles',
  clock: 'rungClock',
};

// Unlock prompt for one locked element, with the escalating wait, the unlock ladder (which
// only skips the wait) and a way into Support Tickets.
export default {
  name: 'MaterialUnlockPanel',
  props: {
    feature: { type: Object, required: true },
    target: { type: String, required: true },
    random: { type: Function, default: Math.random },
  },
  emits: ['unlocked', 'tickets'],
  data() {
    return {
      pin: '',
      password: '',
      code: '',
      message: '',
      wait: this.feature.waitRemaining(this.target),
      rungIndex: -1,
      challenge: null,
      answer: '',
      sums: [],
      hits: 0,
      moleAt: 0,
      secondsLeft: 0,
      timer: null,
    };
  },
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    lock() {
      return (
        this.s.locks.find((l) => l.target === this.target) || { methods: [], label: this.target }
      );
    },
    rungTitle() {
      return this.challenge ? this.t(RUNG_TITLES[this.challenge.rung]) : '';
    },
    dishImage() {
      const row = DIM_SUM_DISHES.find(([, en]) => en === this.challenge?.answer);
      return row
        ? `https://github.com/Ding-Ding-Projects/dim-sum-photos/releases/download/catalog-v1/${row[3]}`
        : '';
    },
    clockHands() {
      if (!this.challenge || this.challenge.rung !== 'clock') return null;
      const { hours, minutes } = this.challenge;
      return { h: ((hours % 12) + minutes / 60) * 30, m: minutes * 6 };
    },
  },
  mounted() {
    this.tick = setInterval(() => {
      this.wait = this.feature.waitRemaining(this.target);
    }, 1000);
  },
  beforeDestroy() {
    clearInterval(this.tick);
    clearInterval(this.timer);
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    async submit() {
      const result = await this.feature.unlockTarget(this.target, {
        pin: this.pin,
        password: this.password,
        code: this.code,
      });
      this.pin = '';
      this.password = '';
      this.code = '';
      if (result.ok) {
        this.$emit('unlocked');
        return;
      }
      this.wait = this.feature.waitRemaining(this.target);
      this.message =
        result.status === 'waiting'
          ? this.t('waitFor', { s: result.wait })
          : `${this.t('wrongValue')} ${result.triesLeft ? this.t('triesLeft', { n: result.triesLeft }) : ''}`;
    },
    startLadder() {
      this.rungIndex = 0;
      this.nextChallenge();
    },
    nextChallenge() {
      const rung = LADDER_RUNGS[this.rungIndex];
      this.challenge = makeChallenge(rung, {
        random: this.random,
        dishes: DIM_SUM_DISHES.slice(0, 60).map(([, en]) => en),
      });
      this.answer = '';
      this.sums = this.challenge.questions ? this.challenge.questions.map(() => '') : [];
      this.hits = 0;
      clearInterval(this.timer);
      if (rung === 'moles') {
        this.secondsLeft = this.challenge.seconds;
        this.moleAt = Math.floor(this.random() * 9);
        this.timer = setInterval(() => {
          this.secondsLeft -= 1;
          this.moleAt = Math.floor(this.random() * 9);
          if (this.secondsLeft <= 0) {
            clearInterval(this.timer);
            this.checkRung(this.hits);
          }
        }, 1000);
      }
    },
    whack(index) {
      if (index !== this.moleAt || this.secondsLeft <= 0) return;
      this.hits += 1;
      this.moleAt = -1;
      if (this.challenge.check(this.hits)) {
        clearInterval(this.timer);
        this.checkRung(this.hits);
      }
    },
    checkRung(value) {
      if (!this.challenge.check(value)) {
        this.message = this.t('notQuite');
        this.nextChallenge();
        return;
      }
      this.message = '';
      if (this.rungIndex < LADDER_RUNGS.length - 1) {
        this.rungIndex += 1;
        this.nextChallenge();
        return;
      }
      this.challenge = null;
      this.rungIndex = -1;
      if (this.feature.skipWait(this.target)) {
        this.wait = 0;
        this.message = this.t('ladderDone');
      }
    },
  },
};
</script>
<template>
  <div class="m3-unlock" data-testid="unlock-panel">
    <h3>{{ t('unlockTitle', { name: lock.label }) }}</h3>
    <p class="m3-unlock__note">{{ t('locksHelp') }}</p>

    <form v-if="!challenge" class="m3-unlock__form" @submit.prevent="submit">
      <label v-if="lock.methods.includes('pin')" class="m3-field">
        <span class="m3-field__label">{{ t('pin') }}</span>
        <input
          v-model="pin"
          class="m3-input"
          type="password"
          inputmode="numeric"
          autocomplete="off"
          data-testid="unlock-pin"
        />
      </label>
      <label v-if="lock.methods.includes('password')" class="m3-field">
        <span class="m3-field__label">{{ t('password') }}</span>
        <input
          v-model="password"
          class="m3-input"
          type="password"
          autocomplete="off"
          data-testid="unlock-password"
        />
      </label>
      <label v-if="lock.methods.includes('totp')" class="m3-field">
        <span class="m3-field__label">{{ t('totp') }}</span>
        <input
          v-model="code"
          class="m3-input"
          inputmode="numeric"
          autocomplete="one-time-code"
          data-testid="unlock-code"
        />
      </label>
      <p v-if="wait > 0" role="status" data-testid="unlock-wait">{{ t('waitFor', { s: wait }) }}</p>
      <p v-if="message" role="alert" data-testid="unlock-message">{{ message }}</p>
      <div class="m3-wizard__actions">
        <button
          type="submit"
          class="m3-btn m3-btn--filled"
          :disabled="wait > 0"
          data-testid="unlock-submit"
        >
          {{ t('unlock') }}
        </button>
        <button
          v-if="wait > 0"
          type="button"
          class="m3-btn m3-btn--outline"
          :disabled="!feature.climbsLeft()"
          data-testid="ladder-start"
          @click="startLadder"
        >
          {{ t('ladder') }}
        </button>
        <button type="button" class="m3-btn" data-testid="open-tickets" @click="$emit('tickets')">
          {{ t('supportTickets') }}
        </button>
      </div>
      <small v-if="wait > 0">{{ t('ladderHelp', { n: feature.climbsLeft() }) }}</small>
    </form>

    <section v-else class="m3-ladder" data-testid="ladder">
      <ol class="m3-ladder__rungs">
        <li
          v-for="(rung, i) in ['dimsum', 'sums', 'moles', 'clock']"
          :key="rung"
          :class="{ done: i < rungIndex, current: i === rungIndex }"
        >
          {{ i + 1 }}
        </li>
      </ol>
      <h4 data-testid="ladder-rung">{{ rungTitle }}</h4>
      <p v-if="message" role="status">{{ message }}</p>

      <div v-if="challenge.rung === 'dimsum'">
        <img v-if="dishImage" class="m3-ladder__dish" :src="dishImage" :alt="t('rungDimsum')" />
        <div class="m3-choice-grid">
          <button
            v-for="choice in challenge.choices"
            :key="choice"
            type="button"
            class="m3-choice"
            @click="checkRung(choice)"
          >
            {{ choice }}
          </button>
        </div>
      </div>

      <form
        v-else-if="challenge.rung === 'sums'"
        class="m3-ladder__sums"
        @submit.prevent="checkRung(sums)"
      >
        <label v-for="(q, i) in challenge.questions" :key="i">
          {{ q[0] }} + {{ q[1] }} =
          <input v-model="sums[i]" class="m3-input" inputmode="numeric" :data-testid="`sum-${i}`" />
        </label>
        <button type="submit" class="m3-btn m3-btn--filled" data-testid="sums-check">
          {{ t('check') }}
        </button>
      </form>

      <div v-else-if="challenge.rung === 'moles'">
        <p aria-live="polite">{{ t('hits', { n: hits, s: secondsLeft }) }}</p>
        <div class="m3-ladder__holes">
          <button
            v-for="i in 9"
            :key="i"
            type="button"
            class="m3-ladder__hole"
            :class="{ up: moleAt === i - 1 }"
            :aria-label="moleAt === i - 1 ? t('mole') : ''"
            :tabindex="moleAt === i - 1 ? 0 : -1"
            @click="whack(i - 1)"
          ></button>
        </div>
      </div>

      <div v-else>
        <svg viewBox="0 0 100 100" width="140" height="140" role="img" :aria-label="t('rungClock')">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="4" />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="26"
            stroke="currentColor"
            stroke-width="6"
            stroke-linecap="round"
            :transform="`rotate(${clockHands.h} 50 50)`"
          />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="12"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            :transform="`rotate(${clockHands.m} 50 50)`"
          />
        </svg>
        <div class="m3-choice-grid">
          <button
            v-for="choice in challenge.choices"
            :key="choice"
            type="button"
            class="m3-choice"
            @click="checkRung(choice)"
          >
            {{ choice }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
