<template>
  <div class="mr-diff-pane">
    <div class="mr-diff-pane__header">{{ file ? file.name : 'No file selected' }}</div>
    <div class="mr-diff-pane__body">
      <div
        v-for="(line, index) in lines"
        :key="index"
        class="mr-diff-line"
        :class="lineClass(line.sign)"
      >
        <span class="mr-diff-line__no" aria-hidden="true">{{ line.no }}</span>
        <span class="mr-diff-line__sign" aria-hidden="true">{{ line.sign === ' ' ? '' : line.sign }}</span>
        <span class="mr-sr-only">{{ signLabel(line.sign) }}</span>
        <span class="mr-diff-line__code">{{ line.code }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MrDiffPane',
  props: {
    file: { type: Object, default: null },
  },
  computed: {
    lines() {
      if (!this.file) return [];
      return this.file.lines.map(([no, sign, code]) => ({ no, sign, code }));
    },
  },
  methods: {
    lineClass(sign) {
      if (sign === '+') return 'mr-diff-line--add';
      if (sign === '-') return 'mr-diff-line--del';
      return '';
    },
    signLabel(sign) {
      if (sign === '+') return 'Added line:';
      if (sign === '-') return 'Removed line:';
      return 'Unchanged line:';
    },
  },
};
</script>
