import { assertMaterialWebRegistration } from './register';

export default {
  name: 'MaterialTextButton',
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    type: { type: String, default: 'button' },
    href: { type: String, default: '' },
  },
  methods: {
    focus(options) {
      this.$el.focus(options);
    },
    blur() {
      this.$el.blur();
    },
  },
  render(h) {
    assertMaterialWebRegistration();
    return h(
      'md-text-button',
      {
        attrs: this.$attrs,
        domProps: { disabled: this.disabled, type: this.type, href: this.href },
        on: this.$listeners,
      },
      this.$slots.default,
    );
  },
};
