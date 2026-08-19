<template>
  <label class="gl-mds-checkbox" :class="{ 'gl-mds-checkbox--checked': checked, 'gl-mds-checkbox--indeterminate': indeterminate }">
    <input
      ref="input"
      type="checkbox"
      class="gl-mds-checkbox__input"
      :checked="checked"
      :aria-label="label"
      @change="$emit('change', $event.target.checked)"
    />
    <span class="gl-mds-checkbox__box" aria-hidden="true">
      <mds-icon v-if="checked && !indeterminate" name="check" size="sm" />
      <span v-else-if="indeterminate" class="gl-mds-checkbox__dash" />
    </span>
  </label>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'SelectCheckbox',
  components: { MdsIcon },
  props: {
    checked: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    label: { type: String, required: true },
  },
  watch: {
    // The DOM `indeterminate` visual state has no HTML attribute; it must be set imperatively.
    indeterminate: {
      immediate: true,
      handler(value) {
        this.$nextTick(() => {
          if (this.$refs.input) this.$refs.input.indeterminate = value;
        });
      },
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  min-width: 40px;
  min-height: 40px;
  justify-content: center;
}

.gl-mds-checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.gl-mds-checkbox__box {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid var(--gl-mds-outl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gl-mds-onprim);
  background: transparent;
}

.gl-mds-checkbox--checked .gl-mds-checkbox__box,
.gl-mds-checkbox--indeterminate .gl-mds-checkbox__box {
  border-color: var(--gl-mds-prim);
  background: var(--gl-mds-prim);
}

.gl-mds-checkbox__dash {
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
}

.gl-mds-checkbox__input:focus-visible + .gl-mds-checkbox__box {
  outline: 2px solid var(--gl-mds-prim);
  outline-offset: 2px;
}
</style>
