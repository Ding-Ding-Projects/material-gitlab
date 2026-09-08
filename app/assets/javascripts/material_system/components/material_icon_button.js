import { assertMaterialWebRegistration } from './register';

export default {
  name: 'MaterialIconButton',
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    type: { type: String, default: 'button' },
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
      'md-icon-button',
      {
        attrs: this.$attrs,
        domProps: { disabled: this.disabled, type: this.type },
        on: this.$listeners,
      },
      this.$slots.default,
    );
  },
};
