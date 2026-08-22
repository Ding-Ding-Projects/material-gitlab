<script>
import MIcon from './MIcon.vue';
import CloneOptionsPopover from './CloneOptionsPopover.vue';

export default {
  name: 'RepositoryHeader',
  components: { MIcon, CloneOptionsPopover },
  props: {
    project: {
      type: Object,
      required: true,
      // { name, visibility, stars, starred, forks, commitCount, branchCount, tagCount, storage, cloneUrls }
    },
  },
  data() {
    return { cloneOpen: false };
  },
  methods: {
    toggleStar() {
      this.$emit('toggle-star');
    },
    fork() {
      this.$emit('fork');
    },
    onCopied(url) {
      this.$emit('notify', { severity: 'success', message: `Copied ${url} to the clipboard.` });
    },
    onCopyFailed() {
      this.$emit('notify', { severity: 'error', message: 'Could not copy the clone URL — copy it manually instead.' });
    },
  },
};
</script>

<template>
  <div class="repo-header">
    <div class="repo-header__top">
      <h1 class="repo-header__title">{{ project.name }}</h1>
      <span class="repo-header__visibility">{{ project.visibility }}</span>
      <div class="repo-header__actions">
        <button
          type="button"
          class="repo-header__pill"
          :aria-pressed="project.starred"
          @click="toggleStar"
        >
          <m-icon name="star" :size="17" decorative />
          {{ project.starred ? 'Starred' : 'Star' }} &middot; {{ project.stars }}
        </button>
        <button type="button" class="repo-header__pill" @click="fork">
          <m-icon name="fork" :size="17" decorative />
          Fork &middot; {{ project.forks }}
        </button>
        <div class="repo-header__clone">
          <button
            type="button"
            class="repo-header__pill repo-header__pill--filled"
            aria-haspopup="dialog"
            :aria-expanded="cloneOpen"
            @click="cloneOpen = !cloneOpen"
          >
            <m-icon name="download" :size="17" decorative />
            Code
          </button>
          <clone-options-popover
            v-if="cloneOpen"
            :clone-urls="project.cloneUrls"
            @close="cloneOpen = false"
            @copied="onCopied"
            @copy-failed="onCopyFailed"
          />
        </div>
      </div>
    </div>
    <div class="repo-header__stats">
      <span><b>{{ project.commitCount.toLocaleString() }}</b> commits</span>
      <span><b>{{ project.branchCount }}</b> branches</span>
      <span><b>{{ project.tagCount }}</b> tags</span>
      <span><b>{{ project.storage }}</b> storage</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.repo-header__top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.repo-header__title {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  font-family: $font-stack;
}

.repo-header__visibility {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--surfc);
  color: var(--onsurfv);
}

.repo-header__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.repo-header__clone {
  position: relative;
}

.repo-header__pill {
  @include focus-ring;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--outl);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--onprimc);
  background: transparent;

  &:hover {
    background: var(--surfc);
  }

  &[aria-pressed='true'] {
    background: var(--primc);
    border-color: transparent;
  }

  &--filled {
    background: var(--prim);
    color: var(--onprim);
    border: none;

    &:hover {
      background: var(--prim);
      opacity: 0.92;
    }
  }
}

.repo-header__stats {
  display: flex;
  gap: 14px;
  font-size: 12.5px;
  color: var(--onsurfv);
  margin-top: 14px;

  b {
    color: var(--onsurf);
  }
}
</style>
