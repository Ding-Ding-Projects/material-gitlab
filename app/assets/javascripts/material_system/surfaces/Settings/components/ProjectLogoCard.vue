<template>
  <div class="st-card" data-screen-label="Logo customization">
    <div class="st-card__title">Project avatar &amp; logo</div>
    <div class="st-logo-row">
      <div class="st-logo-preview" :style="{ background: logoColor }" aria-hidden="true">{{ logoLetter }}</div>
      <div class="st-logo-controls">
        <div class="st-logo-presets" role="radiogroup" aria-label="Logo color presets">
          <button
            v-for="color in presets"
            :key="color"
            type="button"
            role="radio"
            class="st-logo-preset"
            :class="{ 'st-logo-preset--active': color === logoColor }"
            :aria-checked="color === logoColor"
            :aria-label="`Preset color ${color}`"
            :style="{ background: color }"
            @click="$emit('update:logo-color', color)"
          ></button>
        </div>
        <div class="st-logo-upload-row">
          <label class="st-upload">
            <StIcon name="upload" size="small" />
            Upload logo
            <input type="file" accept="image/*" class="st-visually-hidden" @change="onUpload" />
          </label>
          <span class="st-logo-note">{{ logoNote }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { LOGO_PRESET_COLORS } from '../data';

export default {
  name: 'ProjectLogoCard',
  components: { StIcon },
  props: {
    logoColor: { type: String, required: true },
    logoLetter: { type: String, required: true },
    logoFileName: { type: String, default: '' },
  },
  data() {
    return { presets: LOGO_PRESET_COLORS };
  },
  computed: {
    logoNote() {
      return this.logoFileName
        ? `${this.logoFileName} — converted to 24/48/96px locally`
        : 'PNG or SVG · converted locally into all display sizes';
    },
  },
  methods: {
    onUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (file) this.$emit('upload-logo', file);
    },
  },
};
</script>

<style lang="scss" scoped>
.st-logo-row {
  display: flex;
  gap: 14px;
  align-items: center;
}

.st-logo-preview {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 26px;
  flex-shrink: 0;
}

.st-logo-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.st-logo-presets {
  display: flex;
  gap: 6px;
}

.st-logo-preset {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  cursor: pointer;
  border: 2px solid transparent;
  padding: 0;

  &--active {
    border-color: var(--st-onsurf);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-logo-upload-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.st-upload {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed var(--st-outl);
  border-radius: var(--st-radius-pill);
  padding: 7px 16px;
  font-size: 12.5px;
  color: var(--st-onprimc);
  cursor: pointer;
  min-height: var(--st-touch);

  &:focus-within {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-logo-note {
  font-size: 11.5px;
  color: var(--st-onsurfv);
}
</style>
