<template>
  <div class="material-login__brand" data-screen-label="Brand panel">
    <div class="material-login__brand-mark" aria-hidden="true">{{ mark }}</div>
    <div class="material-login__brand-title">{{ title }}</div>
    <p class="material-login__brand-tagline">{{ tagline }}</p>
  </div>
</template>

<script>
export default {
  name: 'BrandPanel',
  props: {
    mark: { type: String, required: true },
    title: { type: String, required: true },
    tagline: { type: String, required: true },
  },
};
</script>
