<template>
  <div class="gl-mds-admin-search" :class="{ 'gl-mds-admin-search--regex': regexMode, 'gl-mds-admin-search--compact': compact }">
    <Icon :name="icon" :size="18" class="gl-mds-admin-search__icon" />
    <input
      v-bind="inputAttrs"
      :id="inputId"
      :value="value"
      type="search"
      class="gl-mds-admin-search__input"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      autocomplete="off"
      @input="$emit('input', $event.target.value)"
    />
    <button
      type="button"
      class="gl-mds-admin-search__chip"
      :aria-pressed="regexMode"
      title="Regex mode — treat the query as a pattern instead of plain text"
      @click="$emit('update:regex-mode', !regexMode)"
    >
      .*
    </button>
    <button
      ref="trigger"
      type="button"
      data-gl-mds-admin-regex-trigger
      class="gl-mds-admin-iconbtn"
      aria-haspopup="dialog"
      :aria-expanded="builderOpen"
      title="Open the regex builder"
      @click="builderOpen = !builderOpen"
    >
      <Icon name="regex" :size="17" />
    </button>
    <RegexBuilderPopover
      :open="builderOpen"
      :initial-pattern="regexMode ? value : ''"
      :corpus="corpus"
      :label="ariaLabel"
      @apply="onApply"
      @close="closeBuilder"
    />
  </div>
</template>

<script>
import Icon from './Icon.vue';
import RegexBuilderPopover from './RegexBuilderPopover.vue';

let uid = 0;

export default {
  name: 'SearchField',
  components: { Icon, RegexBuilderPopover },
  props: {
    value: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    ariaLabel: { type: String, required: true },
    corpus: { type: Array, default: () => [] },
    icon: { type: String, default: 'search' },
    compact: { type: Boolean, default: false },
  },
  data() {
    return { builderOpen: false, inputId: `gl-mds-admin-search-${++uid}` };
  },
  methods: {
    onApply({ pattern }) {
      this.$emit('input', pattern);
      this.$emit('update:regex-mode', true);
      this.builderOpen = false;
      this.$nextTick(() => this.$refs.trigger && this.$refs.trigger.focus());
    },
    closeBuilder() {
      this.builderOpen = false;
      this.$nextTick(() => this.$refs.trigger && this.$refs.trigger.focus());
    },
  },
};
</script>
