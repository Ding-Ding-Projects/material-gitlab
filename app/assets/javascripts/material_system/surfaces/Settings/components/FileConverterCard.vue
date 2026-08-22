<template>
  <div class="st-card" data-screen-label="File converter">
    <div class="st-card__title">Local file converter</div>
    <p class="st-card__desc">
      Convert files locally — byte-based type detection, bounded adapters, honest unsupported-type handling.
      Nothing leaves your machine.
    </p>
    <div class="st-upload-row">
      <label class="st-upload">
        <StIcon name="swap_horiz" size="small" />
        Choose file
        <input type="file" class="st-visually-hidden" @change="onChoose" />
      </label>
      <span class="st-upload-status">{{ status }}</span>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { converterStatusFor } from '../data';

export default {
  name: 'FileConverterCard',
  components: { StIcon },
  props: {
    status: { type: String, required: true },
  },
  methods: {
    onChoose(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      this.$emit('file-chosen', converterStatusFor(file.name, file.type));
    },
  },
};
</script>

<style lang="scss" scoped>
.st-card__desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--st-onsurfv);
  line-height: 1.5;
}

.st-upload-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.st-upload {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed var(--st-outl);
  border-radius: var(--st-radius-pill);
  padding: 8px 18px;
  font-size: 13px;
  color: var(--st-onprimc);
  cursor: pointer;
  min-height: var(--st-touch);

  &:focus-within {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-upload-status {
  font-size: 12px;
  color: var(--st-onsurfv);
}
</style>
