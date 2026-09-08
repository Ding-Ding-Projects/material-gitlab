import { assertMaterialWebRegistration } from './register';
import { selectionControlMethods } from './selection_control';

export default {
  name: 'MaterialSwitch',
  inheritAttrs: false,
  model: { prop: 'selected', event: 'change' },
  props: {
    selected: Boolean,
    value: { type: [String, Number, Boolean], default: 'on' },
    disabled: Boolean,
    required: Boolean,
    icons: Boolean,
    showOnlySelectedIcon: Boolean,
  },
  methods: {
    ...selectionControlMethods,
    onChange(event) {
      this.$emit('change', this.$el.selected);
      this.$emit('native-change', event);
    },
  },
  render(h) {
    assertMaterialWebRegistration();
    return h(
      'md-switch',
      {
        attrs: this.$attrs,
        domProps: {
          selected: this.selected,
          value: String(this.value),
          disabled: this.disabled,
          required: this.required,
          icons: this.icons,
          showOnlySelectedIcon: this.showOnlySelectedIcon,
        },
        on: { ...this.$listeners, change: this.onChange },
      },
      ['on-icon', 'off-icon']
        .filter((name) => this.$slots[name])
        .map((name) =>
          h('span', { attrs: { slot: name, 'aria-hidden': 'true' } }, this.$slots[name]),
        ),
    );
  },
};
