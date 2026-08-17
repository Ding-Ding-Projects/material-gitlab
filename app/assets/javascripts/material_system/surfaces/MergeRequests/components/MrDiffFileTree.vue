<template>
  <div class="mr-diff-tree" role="listbox" aria-label="Changed files" @keydown="onKeydown">
    <button
      v-for="(file, index) in files"
      :key="file.name"
      ref="files"
      type="button"
      class="mr-diff-tree__file"
      role="option"
      :aria-selected="index === activeIndex ? 'true' : 'false'"
      :tabindex="index === activeIndex ? 0 : -1"
      @click="select(index)"
    >
      <span class="material-symbols-outlined mr-diff-tree__file-icon" aria-hidden="true">description</span>
      <span class="mr-diff-tree__file-name">{{ file.name }}</span>
      <span class="mr-diff-tree__stat-add">+{{ file.add }}</span>
      <span class="mr-diff-tree__stat-del">−{{ file.del }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'MrDiffFileTree',
  props: {
    files: { type: Array, required: true },
    activeIndex: { type: Number, required: true },
  },
  methods: {
    select(index) {
      this.$emit('select', index);
    },
    onKeydown(event) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (this.activeIndex + delta + this.files.length) % this.files.length;
      this.select(nextIndex);
      this.$nextTick(() => {
        const target = this.$refs.files && this.$refs.files[nextIndex];
        if (target) target.focus();
      });
    },
  },
};
</script>
