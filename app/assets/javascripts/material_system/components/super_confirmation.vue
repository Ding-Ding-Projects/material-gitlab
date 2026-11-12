<script>
import { GlButton } from '@gitlab/ui';
import { __, s__, sprintf } from '~/locale';

// Destructive super-confirmation: two keys, a full-range slider and an emergency exit.
// Nothing is typed. The slider stays locked until both keys are turned, springs back if
// released before the end, and authorizes only at 100%. Escape and the emergency exit
// cancel without side effects.
export default {
  name: 'SuperConfirmation',
  components: { GlButton },
  props: {
    target: { type: String, required: true },
    keyOneLabel: {
      type: String,
      required: false,
      default: s__('MaterialSuperConfirm|Contents and history go'),
    },
    keyTwoLabel: {
      type: String,
      required: false,
      default: s__('MaterialSuperConfirm|Nothing can be recovered after the grace period'),
    },
    loading: { type: Boolean, required: false, default: false },
    // Extra precondition from the host dialog (for example a required checkbox).
    ready: { type: Boolean, required: false, default: true },
    readyHint: { type: String, required: false, default: '' },
  },
  emits: ['authorized', 'exit'],
  data() {
    return { keyOne: false, keyTwo: false, progress: 0, authorized: false };
  },
  computed: {
    keysTurned() {
      return this.keyOne && this.keyTwo && this.ready;
    },
    sliderLabel() {
      if (this.keyOne && this.keyTwo && !this.ready && this.readyHint) return this.readyHint;
      return this.keysTurned
        ? sprintf(s__('MaterialSuperConfirm|Slide to the end to delete %{target}'), {
            target: this.target,
          })
        : s__('MaterialSuperConfirm|Slider locked until both keys are turned');
    },
    progressText() {
      if (this.authorized) return s__('MaterialSuperConfirm|Authorized');
      return sprintf(__('%{percent}%%'), { percent: this.progress });
    },
  },
  watch: {
    keysTurned(turned) {
      if (!turned) this.progress = 0;
    },
    loading(isLoading, wasLoading) {
      // A failed request leaves the dialog open: let the user try again from the start.
      if (!isLoading && wasLoading) this.reset();
    },
  },
  methods: {
    toggle(key) {
      if (this.authorized || this.loading) return;
      this[key] = !this[key];
    },
    onInput(event) {
      if (!this.keysTurned || this.authorized) return;
      this.progress = Number(event.target.value);
    },
    onRelease() {
      if (!this.keysTurned || this.authorized) return;
      if (this.progress >= 100) {
        this.authorized = true;
        this.$emit('authorized');
      } else {
        this.progress = 0;
      }
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.exit();
      }
    },
    exit() {
      this.reset();
      this.$emit('exit');
    },
    reset() {
      Object.assign(this, { keyOne: false, keyTwo: false, progress: 0, authorized: false });
    },
  },
  i18n: {
    keyOne: s__('MaterialSuperConfirm|Key 1'),
    keyTwo: s__('MaterialSuperConfirm|Key 2'),
    turned: s__('MaterialSuperConfirm|turned'),
    off: s__('MaterialSuperConfirm|off'),
    exit: s__('MaterialSuperConfirm|Emergency exit'),
    nothingToType: s__('MaterialSuperConfirm|Nothing to type. Turn both keys, then slide.'),
  },
};
</script>
<template>
  <div
    class="gl-md3-super-confirm"
    :class="{ 'is-authorized': authorized }"
    data-testid="super-confirmation"
    @keydown="onKeydown"
  >
    <p class="gl-md3-super-confirm__hint">{{ $options.i18n.nothingToType }}</p>
    <div class="gl-md3-super-confirm__keys">
      <button
        v-for="(item, index) in [
          { key: 'keyOne', name: $options.i18n.keyOne, label: keyOneLabel },
          { key: 'keyTwo', name: $options.i18n.keyTwo, label: keyTwoLabel },
        ]"
        :key="item.key"
        type="button"
        role="switch"
        class="gl-md3-super-confirm__key"
        :class="{ 'is-on': $data[item.key] }"
        :aria-checked="String($data[item.key])"
        :aria-label="`${item.name}: ${item.label}`"
        :data-testid="`super-confirmation-key-${index + 1}`"
        :disabled="authorized || loading"
        @click="toggle(item.key)"
      >
        <span class="gl-md3-super-confirm__key-head" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <circle cx="8" cy="12" r="4" />
            <path d="M12 12h9M18 12v3M21 12v2" />
          </svg>
        </span>
        <span class="gl-md3-super-confirm__key-text">
          <strong
            >{{ item.name }}
            {{ $data[item.key] ? $options.i18n.turned : $options.i18n.off }}</strong
          >
          <span class="gl-text-sm">{{ item.label }}</span>
        </span>
      </button>
    </div>
    <label class="gl-md3-super-confirm__label" for="super_confirmation_slider">{{
      sliderLabel
    }}</label>
    <div class="gl-md3-super-confirm__track" :class="{ 'is-locked': !keysTurned }">
      <span class="gl-md3-super-confirm__fill" :style="{ width: `${progress}%` }"></span>
      <span class="gl-md3-super-confirm__value" aria-hidden="true">{{ progressText }}</span>
      <input
        id="super_confirmation_slider"
        type="range"
        min="0"
        max="100"
        step="1"
        :value="progress"
        :disabled="!keysTurned || authorized || loading"
        :aria-valuetext="progressText"
        data-testid="super-confirmation-slider"
        @input="onInput"
        @change="onRelease"
        @pointerup="onRelease"
        @keyup="onRelease"
      />
    </div>
    <gl-button
      class="gl-md3-super-confirm__exit"
      icon="close"
      data-testid="super-confirmation-exit"
      :disabled="loading"
      @click="exit"
      >{{ $options.i18n.exit }} <kbd>Esc</kbd></gl-button
    >
  </div>
</template>
