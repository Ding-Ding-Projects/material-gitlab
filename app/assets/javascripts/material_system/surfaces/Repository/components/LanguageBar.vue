<script>
const TOKEN_VAR = { prim: '--prim', good: '--good', warn: '--warn', outl: '--outl' };

export default {
  name: 'LanguageBar',
  props: {
    languages: {
      type: Array,
      required: true,
      // { name, percent, token }
    },
  },
  computed: {
    segments() {
      return this.languages.map((language) => ({
        ...language,
        color: `var(${TOKEN_VAR[language.token] || '--outl'})`,
      }));
    },
    summary() {
      return this.languages.map((language) => `${language.name} ${language.percent}%`).join(', ');
    },
  },
};
</script>

<template>
  <div class="language-bar" role="img" :aria-label="`Language breakdown: ${summary}`" title="Languages">
    <span
      v-for="segment in segments"
      :key="segment.name"
      class="language-bar__segment"
      :style="{ width: `${segment.percent}%`, background: segment.color }"
      :title="`${segment.name} ${segment.percent}%`"
    ></span>
  </div>
</template>

<style lang="scss" scoped>
.language-bar {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  max-width: 720px;
}

.language-bar__segment {
  height: 100%;
}
</style>
