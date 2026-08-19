<script>
export default {
  name: 'RepositoryBreadcrumbs',
  props: {
    crumbs: {
      type: Array,
      required: true,
      // { name, path }
    },
  },
  methods: {
    isLast(index) {
      return index === this.crumbs.length - 1;
    },
  },
};
</script>

<template>
  <nav class="breadcrumbs" aria-label="Repository path">
    <ol class="breadcrumbs__list">
      <li v-for="(crumb, index) in crumbs" :key="crumb.path.join('/') || 'root'" class="breadcrumbs__item">
        <button
          type="button"
          class="breadcrumbs__crumb"
          :aria-current="isLast(index) ? 'page' : null"
          :disabled="isLast(index)"
          @click="$emit('navigate', crumb.path)"
        >
          {{ crumb.name }}
        </button>
        <span v-if="!isLast(index)" class="breadcrumbs__sep" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.breadcrumbs__list {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--onsurfv);
  font-family: monospace;
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumbs__item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumbs__crumb {
  @include focus-ring;
  background: none;
  border: none;
  padding: 2px 4px;
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
  color: var(--onprimc);

  &:disabled {
    cursor: default;
    color: var(--onsurfv);
  }

  &:hover:not(:disabled) {
    background: var(--surfch);
  }
}

.breadcrumbs__sep {
  color: var(--onsurfv);
}
</style>
