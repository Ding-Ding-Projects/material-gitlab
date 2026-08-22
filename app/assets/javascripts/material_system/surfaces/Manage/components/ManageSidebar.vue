<template>
  <nav class="mg-sidebar" aria-label="Project navigation">
    <ul class="mg-sidebar__list">
      <li v-for="item in items" :key="item.id">
        <a
          class="mg-sidebar__item"
          :class="{ 'mg-sidebar__item--active': item.id === activeId }"
          :href="item.href"
          :aria-current="item.id === activeId ? 'page' : null"
        >
          <MgIcon :name="item.icon" class="mg-sidebar__icon" />
          <span>{{ item.label }}</span>
        </a>
      </li>
    </ul>
  </nav>
</template>

<script>
import MgIcon from './MgIcon.vue';

export default {
  name: 'ManageSidebar',
  components: { MgIcon },
  props: {
    activeId: { type: String, required: true },
    items: { type: Array, required: true },
  },
};
</script>

<style lang="scss" scoped>
.mg-sidebar {
  width: 248px;
  height: 100%;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--mg-surfc);
  border-right: 1px solid var(--mg-outlv);
  padding: 12px 8px;
}

.mg-sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mg-sidebar__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-radius: var(--mg-radius-pill);
  color: var(--mg-onsurfv);
  font-size: 13.5px;
  font-weight: 500;
  min-height: var(--mg-touch);

  &:hover {
    background: var(--mg-surfch);
    color: var(--mg-onsurf);
    text-decoration: none;
  }

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-sidebar__item--active {
  background: var(--mg-primc);
  color: var(--mg-onprimc);

  &:hover {
    background: var(--mg-primc);
    color: var(--mg-onprimc);
  }
}

.mg-sidebar__icon {
  color: inherit;
}
</style>
