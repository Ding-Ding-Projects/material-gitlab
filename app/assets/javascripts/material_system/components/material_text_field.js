import { assertMaterialWebRegistration } from './register';

export default {
  name: 'MaterialTextField',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: '' },
    disabled: Boolean,
    readonly: Boolean,
    required: Boolean,
    type: { type: String, default: 'text' },
  },
  data: () => ({ composing: false }),
  methods: {
    focus(options) {
      this.$el.focus(options);
    },
    blur() {
      this.$el.blur();
    },
    checkValidity() {
      return this.$el.checkValidity();
    },
    reportValidity() {
      return this.$el.reportValidity();
    },
    setCustomValidity(message) {
      this.$el.setCustomValidity(message);
    },
    onInput(event) {
      // Material Web updates its host value before the composed input event arrives.
      // Vue 2's component v-model expects the value rather than the native event.
      if (!this.composing && !event.isComposing) this.$emit('input', this.$el.value);
    },
    onCompositionStart(event) {
      this.composing = true;
      this.$emit('compositionstart', event);
    },
    onCompositionEnd(event) {
      this.composing = false;
      this.$emit('input', this.$el.value);
      this.$emit('compositionend', event);
    },
  },
  render(h) {
    assertMaterialWebRegistration();
    return h(
      'md-filled-text-field',
      {
        attrs: this.$attrs,
        domProps: {
          value: String(this.value ?? ''),
          disabled: this.disabled,
          readOnly: this.readonly,
          required: this.required,
          type: this.type,
        },
        on: {
          ...this.$listeners,
          input: this.onInput,
          compositionstart: this.onCompositionStart,
          compositionend: this.onCompositionEnd,
        },
      },
      this.$slots.default,
    );
  },
};
