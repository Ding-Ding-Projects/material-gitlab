<script>
import MIcon from './MIcon.vue';

export default {
  name: 'BlobViewer',
  components: { MIcon },
  props: {
    blob: {
      type: Object,
      required: true,
      // { name, size, lines }
    },
  },
  computed: {
    numberedLines() {
      return this.blob.lines.map((code, index) => ({ no: index + 1, code: code || ' ' }));
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.closeButton && this.$refs.closeButton.focus());
  },
};
</script>

<template>
  <div class="blob-viewer" data-screen-label="Blob viewer">
    <div class="blob-viewer__head">
      <m-icon name="file" :size="18" decorative class="blob-viewer__icon" />
      <span class="blob-viewer__name">{{ blob.name }}</span>
      <span class="blob-viewer__size">{{ blob.size }}</span>
      <button ref="closeButton" type="button" class="blob-viewer__close" aria-label="Close file preview" @click="$emit('close')">
        <m-icon name="close" :size="18" decorative />
      </button>
    </div>
    <div class="blob-viewer__code" role="group" :aria-label="`Contents of ${blob.name}`">
      <div v-for="line in numberedLines" :key="line.no" class="blob-viewer__line">
        <span class="blob-viewer__lineno" aria-hidden="true">{{ line.no }}</span>
        <span class="blob-viewer__code-text">{{ line.code }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.blob-viewer {
  @include card-surface;
  @include thin-scrollbar;

  overflow: hidden;
  max-width: 980px;
}

.blob-viewer__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--outlv);
}

.blob-viewer__icon {
  color: var(--onsurfv);
}

.blob-viewer__name {
  font-family: monospace;
  font-size: 13px;
  font-weight: 500;
}

.blob-viewer__size {
  font-size: 12px;
  color: var(--onsurfv);
}

.blob-viewer__close {
  @include focus-ring;
  margin-left: auto;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--onsurf);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--surfch);
  }
}

.blob-viewer__code {
  max-height: 60vh;
  overflow: auto;
  padding: 4px 0;
}

.blob-viewer__line {
  display: flex;
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.85;
}

.blob-viewer__lineno {
  width: 44px;
  flex-shrink: 0;
  text-align: right;
  padding-right: 12px;
  color: var(--onsurfv);
  opacity: 0.55;
  user-select: none;
}

.blob-viewer__code-text {
  white-space: pre;
}
</style>
