import { assertMaterialWebRegistration } from './register';

export const MATERIAL_BUTTON_VARIANTS = Object.freeze({
  filled: 'md-filled-button',
  outlined: 'md-outlined-button',
  tonal: 'md-filled-tonal-button',
  elevated: 'md-elevated-button',
  text: 'md-text-button',
});

export default {
  name: 'MaterialButton',
  inheritAttrs: false,
  props: {
    variant: { type: String, default: 'filled' },
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
    if (!Object.prototype.hasOwnProperty.call(MATERIAL_BUTTON_VARIANTS, this.variant)) {
      throw new Error(`Unsupported Material button variant: ${this.variant}`);
    }
    const tag = MATERIAL_BUTTON_VARIANTS[this.variant];
    return h(
      tag,
      {
        attrs: this.$attrs,
        domProps: { disabled: this.disabled, type: this.type, href: this.href },
        on: this.$listeners,
      },
      [
        this.$slots.icon
          ? h('span', { attrs: { slot: 'icon', 'aria-hidden': 'true' } }, this.$slots.icon)
          : null,
        this.$slots.default,
      ],
    );
  },
};
