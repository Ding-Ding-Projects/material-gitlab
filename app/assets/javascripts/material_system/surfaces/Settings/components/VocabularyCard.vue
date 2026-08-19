<template>
  <div class="st-card" data-screen-label="Vocabulary">
    <div class="st-card__title">Personal vocabulary</div>
    <p class="st-card__desc">
      Upload a local vocabulary JSON to relabel UI terms across this site. Stays in your browser; validated for
      version, schema, and size before applying.
    </p>
    <div class="st-upload-row">
      <label class="st-upload">
        <StIcon name="upload_file" size="small" />
        Upload vocabulary JSON
        <input type="file" accept=".json" class="st-visually-hidden" @change="onUpload" />
      </label>
      <span class="st-upload-status" :class="statusClass">{{ status }}</span>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { validateVocabularyPayload } from '../data';

export default {
  name: 'VocabularyCard',
  components: { StIcon },
  props: {
    status: { type: String, required: true },
    ok: { type: Boolean, default: null },
  },
  computed: {
    statusClass() {
      if (this.ok === false) return 'st-upload-status--error';
      if (this.ok === true) return 'st-upload-status--ok';
      return '';
    },
  },
  methods: {
    onUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = validateVocabularyPayload(String(reader.result || ''), file.size);
        this.$emit('vocabulary-loaded', result);
      };
      reader.onerror = () => this.$emit('vocabulary-loaded', { ok: false, status: 'Rejected: could not read file' });
      reader.readAsText(file);
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

.st-upload-status--error {
  color: var(--st-err);
}

.st-upload-status--ok {
  color: var(--st-good);
}
</style>
