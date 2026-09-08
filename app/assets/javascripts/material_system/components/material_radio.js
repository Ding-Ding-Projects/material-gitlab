import { assertMaterialWebRegistration } from './register';
import { selectionControlMethods, selectionValueEquals } from './selection_control';

export default {
  name: 'MaterialRadio',
  inheritAttrs: false,
  model: { prop: 'modelValue', event: 'change' },
  props: {
    modelValue: { type: [String, Number, Boolean], default: null },
    value: { type: [String, Number, Boolean], default: 'on' },
    disabled: Boolean,
    required: Boolean,
  },
  methods: {
    ...selectionControlMethods,
    onChange(event) {
      if (this.$el.checked) this.$emit('change', this.value);
      this.$emit('native-change', event);
    },
  },
  render(h) {
    assertMaterialWebRegistration();
    return h('md-radio', {
      attrs: this.$attrs,
      domProps: {
        checked: selectionValueEquals(this.modelValue, this.value),
        value: String(this.value),
        disabled: this.disabled,
        required: this.required,
      },
      on: { ...this.$listeners, change: this.onChange },
    });
  },
};
