<script>
import MIcon from './MIcon.vue';

export default {
  name: 'CloneOptionsPopover',
  components: { MIcon },
  props: {
    cloneUrls: {
      type: Object,
      required: true,
      // { https, ssh }
    },
  },
  data() {
    return { activeTab: 'https' };
  },
  computed: {
    activeUrl() {
      return this.cloneUrls[this.activeTab];
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.closeButton && this.$refs.closeButton.focus());
    document.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') this.$emit('close');
    },
    async copy() {
      try {
        await navigator.clipboard.writeText(this.activeUrl);
        this.$emit('copied', this.activeUrl);
      } catch (_error) {
        this.$emit('copy-failed', this.activeUrl);
      }
    },
  },
};
</script>

<template>
  <div class="clone-popover" role="dialog" aria-label="Clone repository" @keydown.esc="$emit('close')">
    <div class="clone-popover__tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="clone-popover__tab"
        :class="{ 'is-active': activeTab === 'https' }"
        :aria-selected="activeTab === 'https'"
        @click="activeTab = 'https'"
      >
        HTTPS
      </button>
      <button
        type="button"
        role="tab"
        class="clone-popover__tab"
        :class="{ 'is-active': activeTab === 'ssh' }"
        :aria-selected="activeTab === 'ssh'"
        @click="activeTab = 'ssh'"
      >
        SSH
      </button>
      <button ref="closeButton" type="button" class="clone-popover__close" aria-label="Close clone options" @click="$emit('close')">
        <m-icon name="close" :size="16" decorative />
      </button>
    </div>
    <div class="clone-popover__row">
      <label class="visually-hidden" for="clone-url-field">{{ activeTab === 'https' ? 'HTTPS clone URL' : 'SSH clone URL' }}</label>
      <input id="clone-url-field" class="clone-popover__url" type="text" :value="activeUrl" readonly @focus="$event.target.select()" />
      <button type="button" class="clone-popover__copy" @click="copy">
        <m-icon name="copy" :size="16" decorative />
        Copy
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.clone-popover {
  @include overlay-surface(16px);

  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: min(360px, calc(100vw - 32px));
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.clone-popover__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.clone-popover__tab {
  @include focus-ring;
  padding: 6px 12px;
  border-radius: 999px;
  border: none;
  background: var(--surfc);
  color: var(--onsurfv);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &.is-active {
    background: var(--prim);
    color: var(--onprim);
  }
}

.clone-popover__close {
  @include focus-ring;
  margin-left: auto;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--onsurfv);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--surfch);
  }
}

.clone-popover__row {
  display: flex;
  gap: 6px;
}

.clone-popover__url {
  @include focus-ring;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--outl);
  border-radius: 10px;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 12px;
  background: var(--surfcl);
  color: var(--onsurf);
}

.clone-popover__copy {
  @include focus-ring;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  background: var(--prim);
  color: var(--onprim);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.visually-hidden {
  @include visually-hidden;
}
</style>
