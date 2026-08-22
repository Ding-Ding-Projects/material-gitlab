<template>
  <div class="st-row" data-screen-label="Member row">
    <input
      type="checkbox"
      class="st-row__checkbox"
      :checked="selected"
      :aria-label="`Select ${member.name}`"
      @change="$emit('toggle-select', member.id)"
    />
    <div class="st-row__avatar" aria-hidden="true">{{ initials }}</div>
    <div class="st-row__info">
      <div class="st-row__name">{{ member.name }}</div>
      <div class="st-row__handle">@{{ member.handle }}</div>
    </div>
    <div class="st-role-menu">
      <button
        type="button"
        class="st-role-menu__trigger"
        :aria-expanded="menuOpen"
        aria-haspopup="listbox"
        @click="$emit('toggle-menu', member.id)"
      >
        {{ member.role }}
        <StIcon name="chevron_down" size="small" />
      </button>
      <ul v-if="menuOpen" class="st-role-menu__list" role="listbox" :aria-label="`Role for ${member.name}`">
        <li
          v-for="role in roles"
          :key="role"
          role="option"
          class="st-role-menu__item"
          :class="{ 'st-role-menu__item--active': role === member.role }"
          :aria-selected="role === member.role"
          @click="$emit('set-role', { id: member.id, role })"
        >
          {{ role }}
        </li>
      </ul>
    </div>
    <button type="button" class="st-row__remove" :aria-label="`Remove ${member.name}`" @click="$emit('remove', member.id)">
      <StIcon name="delete" size="small" />
    </button>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { ROLE_OPTIONS, initialsFor } from '../data';

export default {
  name: 'MemberRow',
  components: { StIcon },
  props: {
    member: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    menuOpen: { type: Boolean, default: false },
  },
  data() {
    return { roles: ROLE_OPTIONS };
  },
  computed: {
    initials() {
      return initialsFor(this.member.name);
    },
  },
};
</script>

<style lang="scss" scoped>
.st-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--st-outlv);
}

.st-row__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--st-prim);
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-row__avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: var(--st-sec);
  color: var(--st-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.st-row__info {
  flex: 1;
  min-width: 0;
}

.st-row__name {
  font-weight: 500;
  font-size: 13.5px;
}

.st-row__handle {
  font-size: 12px;
  color: var(--st-onsurfv);
}

.st-role-menu {
  position: relative;
}

.st-role-menu__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--st-surfc);
  border-radius: 10px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  color: var(--st-onsurf);
  min-height: 36px;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-role-menu__list {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--st-card);
  border-radius: 12px;
  box-shadow: var(--st-elevation-3);
  padding: 5px;
  z-index: 20;
  min-width: 140px;
  list-style: none;
  margin: 0;
  max-height: min(220px, 50vh);
  overflow-y: auto;
}

.st-role-menu__item {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  cursor: pointer;

  &--active {
    background: var(--st-sec);
  }

  &:hover {
    background: var(--st-surfch);
  }
}

.st-row__remove {
  border: none;
  background: transparent;
  color: var(--st-err);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}
</style>
