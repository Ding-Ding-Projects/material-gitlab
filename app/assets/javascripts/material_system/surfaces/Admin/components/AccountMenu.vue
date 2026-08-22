<template>
  <div class="gl-mds-admin-account">
    <button
      ref="trigger"
      type="button"
      class="gl-mds-admin-account__avatar"
      :aria-label="`Account menu for ${name}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ initials }}
    </button>

    <div
      v-if="open"
      ref="menu"
      class="gl-mds-admin-popover gl-mds-admin-popover--account"
      role="menu"
      :aria-label="`Account menu for ${name}`"
      @keydown.esc="close"
    >
      <div class="gl-mds-admin-account__name">{{ name }}</div>
      <a role="menuitem" href="/-/profile" class="gl-mds-admin-account__item">
        <Icon name="person" :size="16" />
        Profile
      </a>
      <button role="menuitem" type="button" class="gl-mds-admin-account__item gl-mds-admin-account__item--button" @click="signOut">
        <Icon name="logout" :size="16" />
        Sign out
      </button>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'AccountMenu',
  components: { Icon },
  props: {
    initials: { type: String, default: 'JD' },
    name: { type: String, default: 'Jordan Diaz' },
  },
  data() {
    return { open: false };
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        document.addEventListener('mousedown', this.handleOutsideClick, true);
        this.$nextTick(() => {
          const first = this.$refs.menu && this.$refs.menu.querySelector('[role="menuitem"]');
          if (first) first.focus();
        });
      } else {
        document.removeEventListener('mousedown', this.handleOutsideClick, true);
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
  },
  methods: {
    close() {
      this.open = false;
      this.$nextTick(() => this.$refs.trigger && this.$refs.trigger.focus());
    },
    signOut() {
      this.close();
      this.$emit('sign-out');
    },
    handleOutsideClick(event) {
      if (this.$refs.menu && this.$refs.menu.contains(event.target)) return;
      if (this.$refs.trigger && this.$refs.trigger.contains(event.target)) return;
      this.close();
    },
  },
};
</script>
