<template>
  <nav class="dp-sidebar" aria-label="Project navigation" data-screen-label="Sidebar">
    <ul class="dp-sidebar__list">
      <li v-for="item in items" :key="item.id">
        <a
          class="dp-sidebar__item"
          :class="{ 'dp-sidebar__item--active': item.active }"
          :href="item.href"
          :title="item.label"
          :aria-current="item.active ? 'page' : null"
        >
          <DpIcon :name="item.icon" class="dp-sidebar__icon" />
          <span>{{ item.label }}</span>
        </a>

        <ul v-if="item.active" class="dp-sidebar__sublist" aria-label="Deploy">
          <li v-for="sub in subItems" :key="sub.tabId">
            <a
              class="dp-sidebar__subitem"
              :class="{ 'dp-sidebar__subitem--active': sub.tabId === activeTabId }"
              :href="sub.href"
              :title="sub.label"
              :aria-current="sub.tabId === activeTabId ? 'page' : null"
              @click="onSubClick($event, sub.tabId)"
            >
              <DpIcon :name="sub.icon" size="small" class="dp-sidebar__icon" />
              <span>{{ sub.label }}</span>
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script>
import DpIcon from './DpIcon.vue';

export default {
  name: 'DeploySidebar',
  components: { DpIcon },
  props: {
    items: { type: Array, required: true },
    subItems: { type: Array, required: true },
    activeTabId: { type: String, required: true },
  },
  methods: {
    onSubClick(event, tabId) {
      // A real anchor stays clickable (open in new tab, copy link); a plain click
      // switches the tab in place since Deploy's sub-nav mirrors this surface's own tabs.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      this.$emit('select-tab', tabId);
    },
  },
};
</script>

<style lang="scss" scoped>
.dp-sidebar {
  width: 248px;
  height: 100%;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--dp-surfc);
  border-right: 1px solid var(--dp-outlv);
  padding: 12px 8px;
}

.dp-sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dp-sidebar__sublist {
  list-style: none;
  margin: 2px 0 6px;
  padding: 0 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  border-left: 1px solid var(--dp-outlv);
}

.dp-sidebar__item,
.dp-sidebar__subitem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-radius: 999px;
  color: var(--dp-onsurfv);
  font-size: 13.5px;
  font-weight: 500;
  min-height: 40px;

  &:hover {
    background: var(--dp-surfch);
    color: var(--dp-onsurf);
    text-decoration: none;
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-sidebar__subitem {
  padding: 7px 12px;
  font-size: 12.5px;
}

.dp-sidebar__item--active,
.dp-sidebar__subitem--active {
  background: var(--dp-primc);
  color: var(--dp-onprimc);

  &:hover {
    background: var(--dp-primc);
    color: var(--dp-onprimc);
  }
}

.dp-sidebar__icon {
  color: inherit;
}

// Narrow layouts collapse to an icon rail rather than clipping the labels — the
// full label is still available as the link's accessible name and title.
@media (max-width: 900px) {
  .dp-sidebar {
    width: 72px;
  }

  .dp-sidebar__item span,
  .dp-sidebar__subitem span {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .dp-sidebar__item,
  .dp-sidebar__subitem {
    justify-content: center;
  }

  .dp-sidebar__sublist {
    padding-left: 0;
    border-left: none;
    align-items: center;
  }
}
</style>
