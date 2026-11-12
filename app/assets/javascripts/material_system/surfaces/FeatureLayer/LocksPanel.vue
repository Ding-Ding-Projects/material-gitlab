<script>
import { t } from '../../features/i18n';
import { LOCK_MIXES } from '../../features/locks';
import { generateSecret, otpauthUri, verifyTotp } from '../../features/totp';
import { encodeQr, qrSvgPath } from '../../features/qr';

const HUB_TARGETS = [
  'language',
  'accessibility',
  'adhd',
  'school',
  'wording',
  'name',
  'color',
  'extensions',
  'schedules',
  'export',
];

// Lock wizard (choose an element, one of six credential mixes, then set the values), the list
// of locks, and Support Tickets.
export default {
  name: 'MaterialLocksPanel',
  props: {
    feature: { type: Object, required: true },
    view: { type: String, default: 'locks' },
  },
  data() {
    return {
      step: 0,
      target: '',
      mixIndex: 0,
      pin: '',
      password: '',
      secret: '',
      code: '',
      errors: [],
      subject: '',
      tickets: this.feature.tickets(),
      showTickets: this.view === 'tickets',
    };
  },
  computed: {
    s() {
      return this.feature.state;
    },
    lang() {
      return this.s.lang;
    },
    mixes: () => LOCK_MIXES,
    methods() {
      return LOCK_MIXES[this.mixIndex];
    },
    targets() {
      const hub = HUB_TARGETS.map((id) => ({
        id: `hub:${id}`,
        label: `${this.t('features')}: ${id}`,
      }));
      const tabs = this.s.tabTargets.map(({ id, label }) => ({ id: `tab:${id}`, label }));
      return [...tabs, ...hub].filter(({ id }) => !this.feature.isLocked(id));
    },
    targetLabel() {
      return this.targets.find(({ id }) => id === this.target)?.label || this.target;
    },
    qr() {
      if (!this.secret) return null;
      return qrSvgPath(encodeQr(otpauthUri({ secret: this.secret, label: this.targetLabel })));
    },
  },
  methods: {
    t(key, vars) {
      return t(key, this.lang, vars);
    },
    mixLabel(mix) {
      return mix.map((m) => this.t(m)).join(' + ');
    },
    begin() {
      Object.assign(this, {
        step: 1,
        target: this.targets[0]?.id || '',
        mixIndex: 0,
        pin: '',
        password: '',
        secret: '',
        code: '',
        errors: [],
      });
    },
    toValues() {
      if (this.methods.includes('totp') && !this.secret) this.secret = generateSecret();
      this.step = 2;
    },
    async save() {
      this.errors = [];
      if (this.methods.includes('totp') && !(await verifyTotp(this.secret, this.code))) {
        this.errors = ['codeWrong'];
        return;
      }
      const result = await this.feature.lockTarget(this.target, {
        label: this.targetLabel,
        methods: this.methods,
        pin: this.pin,
        password: this.password,
        totpSecret: this.methods.includes('totp') ? this.secret : undefined,
      });
      if (!result.ok) {
        this.errors = result.errors.map(
          (e) => ({ pin: 'invalidPin', password: 'invalidPassword' })[e] || 'saveFailed',
        );
        return;
      }
      this.step = 0;
      this.pin = '';
      this.password = '';
      this.secret = '';
    },
    file() {
      if (this.feature.fileTicket(this.subject)) this.subject = '';
      this.tickets = this.feature.tickets();
    },
    resolve(id) {
      this.feature.resolveTicket(id);
      this.tickets = this.feature.tickets();
    },
  },
};
</script>
<template>
  <div class="m3-locks" data-testid="locks-panel">
    <p class="m3-unlock__note">{{ t('locksHelp') }}</p>

    <template v-if="step === 0">
      <ul v-if="s.locks.length" class="m3-list">
        <li v-for="lock in s.locks" :key="lock.target" class="m3-field m3-field--row">
          <span
            ><strong>{{ lock.label }}</strong
            ><small>{{ mixLabel(lock.methods) }}</small></span
          >
          <button
            type="button"
            class="m3-btn m3-btn--outline"
            :data-testid="`unlock-${lock.target}`"
            @click="feature.requestUnlock(lock.target)"
          >
            {{ t('unlock') }}
          </button>
        </li>
      </ul>
      <p v-else>{{ t('noLocks') }}</p>
      <button
        type="button"
        class="m3-btn m3-btn--filled"
        data-testid="lock-begin"
        :disabled="!targets.length"
        @click="begin"
      >
        {{ t('lockSomething') }}
      </button>
      <button
        type="button"
        class="m3-btn"
        data-testid="tickets-toggle"
        @click="showTickets = !showTickets"
      >
        {{ t('supportTickets') }}
      </button>
    </template>

    <template v-else-if="step === 1">
      <label class="m3-field">
        <span class="m3-field__label">{{ t('lockWhat') }}</span>
        <select v-model="target" class="m3-input" data-testid="lock-target">
          <option v-for="item in targets" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </label>
      <fieldset class="m3-field">
        <legend class="m3-field__label">{{ t('lockWith') }}</legend>
        <label v-for="(mix, i) in mixes" :key="i" class="m3-popover__row">
          <span>{{ mixLabel(mix) }}</span>
          <input
            v-model="mixIndex"
            type="radio"
            name="lock-mix"
            :value="i"
            :data-testid="`lock-mix-${i}`"
          />
        </label>
      </fieldset>
      <div class="m3-wizard__actions">
        <button type="button" class="m3-btn" @click="step = 0">{{ t('back') }}</button>
        <span class="m3-wizard__spacer"></span>
        <button
          type="button"
          class="m3-btn m3-btn--filled"
          data-testid="lock-next"
          @click="toValues"
        >
          {{ t('next') }}
        </button>
      </div>
    </template>

    <template v-else>
      <h3>{{ targetLabel }}</h3>
      <label v-if="methods.includes('pin')" class="m3-field">
        <span class="m3-field__label">{{ t('pin') }}</span>
        <input
          v-model="pin"
          class="m3-input"
          type="password"
          inputmode="numeric"
          autocomplete="new-password"
          data-testid="lock-pin"
        />
        <small>{{ t('pinHint') }}</small>
      </label>
      <label v-if="methods.includes('password')" class="m3-field">
        <span class="m3-field__label">{{ t('password') }}</span>
        <input
          v-model="password"
          class="m3-input"
          type="password"
          autocomplete="new-password"
          data-testid="lock-password"
        />
        <small>{{ t('passwordHint') }}</small>
      </label>
      <div v-if="methods.includes('totp')" class="m3-pair">
        <p>{{ t('pairAuthenticator') }}</p>
        <svg
          v-if="qr"
          class="m3-pair__qr"
          :viewBox="`0 0 ${qr.size} ${qr.size}`"
          role="img"
          :aria-label="t('pairAuthenticator')"
          shape-rendering="crispEdges"
          data-testid="lock-qr"
        >
          <rect :width="qr.size" :height="qr.size" fill="#fff" />
          <path :d="qr.d" fill="#000" />
        </svg>
        <p class="m3-mono">
          {{ t('secretKey') }}: <span data-testid="lock-secret">{{ secret }}</span>
        </p>
        <label class="m3-field">
          <span class="m3-field__label">{{ t('confirmCode') }}</span>
          <input
            v-model="code"
            class="m3-input"
            inputmode="numeric"
            autocomplete="one-time-code"
            data-testid="lock-code"
          />
        </label>
      </div>
      <ul v-if="errors.length" class="m3-hub__error" role="alert">
        <li v-for="e in errors" :key="e">{{ t(e) }}</li>
      </ul>
      <div class="m3-wizard__actions">
        <button type="button" class="m3-btn" @click="step = 1">{{ t('back') }}</button>
        <span class="m3-wizard__spacer"></span>
        <button type="button" class="m3-btn m3-btn--filled" data-testid="lock-save" @click="save">
          {{ t('lockIt') }}
        </button>
      </div>
    </template>

    <section v-if="showTickets && step === 0" class="m3-tickets" data-testid="tickets">
      <h3>{{ t('supportTickets') }}</h3>
      <p class="m3-unlock__note">{{ t('ticketsHelp') }}</p>
      <form class="m3-field" @submit.prevent="file">
        <label class="m3-field__label" for="m3-ticket-subject">{{ t('ticketSubject') }}</label>
        <input
          id="m3-ticket-subject"
          v-model="subject"
          class="m3-input"
          maxlength="200"
          data-testid="ticket-subject"
        />
        <button type="submit" class="m3-btn m3-btn--filled" data-testid="ticket-file">
          {{ t('newTicket') }}
        </button>
      </form>
      <ul class="m3-list">
        <li v-for="ticket in tickets" :key="ticket.id" class="m3-list__row">
          <strong>#{{ ticket.id }} {{ ticket.subject }}</strong>
          <small
            >{{ ticket.openedAt }} ·
            {{ ticket.status === 'resolved' ? t('resolved') : ticket.status }}</small
          >
          <span>{{ t('ticketReply') }}</span>
          <button
            v-if="ticket.status !== 'resolved'"
            type="button"
            class="m3-btn"
            @click="resolve(ticket.id)"
          >
            {{ t('resolve') }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
