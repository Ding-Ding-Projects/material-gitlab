// Vue's native selection models compare primitive values by their string form.
// Model values are scalar here; their string form is also the submitted form value.
export const selectionValueEquals = (left, right) =>
  [left, right].every((value) => ['string', 'number', 'boolean'].includes(typeof value)) &&
  String(left) === String(right);

export const selectionControlMethods = {
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
};
