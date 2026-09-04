<script>
import { uniqueId } from 'lodash-es';
import { __ } from '~/locale';
import Md3Button from './md3_button.vue';

const TYPES = ['text', 'password', 'email', 'search', 'number', 'tel', 'url'];

export default {
  name: 'Md3TextField',
  components: { Md3Button },
  inheritAttrs: false,
  model: {
    prop: 'value',
    event: 'input',
  },
  props: {
    value: {
      type: [String, Number],
      required: false,
      default: '',
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: false,
      default: 'text',
      validator: (value) => TYPES.includes(value),
    },
    id: {
      type: String,
      required: false,
      default: () => uniqueId('md3-text-field-'),
    },
    name: {
      type: String,
      required: false,
      default: null,
    },
    placeholder: {
      type: String,
      required: false,
      default: null,
    },
    helpText: {
      type: String,
      required: false,
      default: null,
    },
    errorMessage: {
      type: String,
      required: false,
      default: null,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    readonly: {
      type: Boolean,
      required: false,
      default: false,
    },
    required: {
      type: Boolean,
      required: false,
      default: false,
    },
    multiline: {
      type: Boolean,
      required: false,
      default: false,
    },
    rows: {
      type: Number,
      required: false,
      default: 4,
    },
    leadingIcon: {
      type: String,
      required: false,
      default: null,
    },
    autocomplete: {
      type: String,
      required: false,
      default: null,
    },
  },
  data() {
    return {
      revealed: false,
    };
  },
  computed: {
    helpId() {
      return `${this.id}-help`;
    },
    errorId() {
      return `${this.id}-error`;
    },
    describedBy() {
      if (this.errorMessage) return this.errorId;
      if (this.helpText) return this.helpId;
      return null;
    },
    isInvalid() {
      return Boolean(this.errorMessage);
    },
    inputType() {
      return this.type === 'password' && this.revealed ? 'text' : this.type;
    },
    classes() {
      return {
        'md3-text-field--invalid': this.isInvalid,
        'md3-text-field--disabled': this.disabled,
        'md3-text-field--multiline': this.multiline,
      };
    },
    showPasswordLabel() {
      return __('Show password');
    },
    hidePasswordLabel() {
      return __('Hide password');
    },
    listeners() {
      return {
        ...this.$listeners,
        input: this.handleInput,
      };
    },
  },
  methods: {
    handleInput(event) {
      this.$emit('input', event.target.value);
    },
    toggleReveal() {
      this.revealed = !this.revealed;
    },
    focus() {
      if (this.$refs.input) this.$refs.input.focus();
    },
  },
};
</script>

<template>
  <div class="md3-text-field" :class="classes">
    <label :for="id" class="md3-text-field__label">
      {{ label
      }}<span v-if="required" class="md3-text-field__required-mark" aria-hidden="true">*</span>
    </label>
    <div class="md3-text-field__control">
      <span
        v-if="leadingIcon"
        class="material-symbols-outlined md3-text-field__icon md3-text-field__icon--leading"
        aria-hidden="true"
        >{{ leadingIcon }}</span
      >
      <textarea
        v-if="multiline"
        :id="id"
        ref="input"
        class="md3-text-field__input"
        :name="name"
        :rows="rows"
        :value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :aria-invalid="isInvalid ? 'true' : null"
        :aria-describedby="describedBy"
        v-bind="$attrs"
        v-on="listeners"
      ></textarea>
      <input
        v-else
        :id="id"
        ref="input"
        class="md3-text-field__input"
        :type="inputType"
        :name="name"
        :value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :aria-invalid="isInvalid ? 'true' : null"
        :aria-describedby="describedBy"
        v-bind="$attrs"
        v-on="listeners"
      />
      <md3-button
        v-if="type === 'password' && !multiline"
        variant="text"
        size="small"
        icon-only
        :icon="revealed ? 'visibility_off' : 'visibility'"
        class="md3-text-field__reveal"
        :aria-label="revealed ? hidePasswordLabel : showPasswordLabel"
        @click="toggleReveal"
      />
    </div>
    <p v-if="errorMessage" :id="errorId" class="md3-text-field__error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-else-if="helpText" :id="helpId" class="md3-text-field__help">{{ helpText }}</p>
  </div>
</template>
