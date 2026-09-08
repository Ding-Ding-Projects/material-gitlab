import { assertMaterialWebRegistration } from './register';
import { selectionControlMethods, selectionValueEquals } from './selection_control';

export default {
  name: 'MaterialCheckbox',
  inheritAttrs: false,
  model: { prop: 'checked', event: 'change' },
  props: {
    checked: { type: [Boolean, String, Number, Array], default: false },
    value: { type: [String, Number, Boolean], default: 'on' },
    trueValue: { type: [Boolean, String, Number], default: true },
    falseValue: { type: [Boolean, String, Number], default: false },
    disabled: Boolean,
    required: Boolean,
    indeterminate: Boolean,
  },
  computed: {
    isChecked() {
      return Array.isArray(this.checked)
        ? this.checked.some((item) => selectionValueEquals(item, this.value))
        : selectionValueEquals(this.checked, this.trueValue);
    },
  },
  methods: {
    ...selectionControlMethods,
    onChange(event) {
      const selected = this.$el.checked;
      let next = selected ? this.trueValue : this.falseValue;
      if (Array.isArray(this.checked)) {
        const index = this.checked.findIndex((item) => selectionValueEquals(item, this.value));
        next = [...this.checked];
        if (selected && index === -1) next.push(this.value);
        else if (!selected && index !== -1) next.splice(index, 1);
      }
      this.$emit('change', next);
      this.$emit('native-change', event);
    },
  },
  render(h) {
    assertMaterialWebRegistration();
    return h('md-checkbox', {
      attrs: this.$attrs,
      domProps: {
        checked: this.isChecked,
        value: String(this.value),
        disabled: this.disabled,
        required: this.required,
        indeterminate: this.indeterminate,
      },
      on: { ...this.$listeners, change: this.onChange },
    });
  },
};
