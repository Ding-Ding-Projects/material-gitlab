<script>
import MIcon from './MIcon.vue';

export default {
  name: 'CommitsPanel',
  components: { MIcon },
  props: {
    commits: {
      type: Array,
      required: true,
      // { sha, message, author, when, avatar }
    },
  },
  methods: {
    async copySha(sha) {
      try {
        await navigator.clipboard.writeText(sha);
        this.$emit('notify', { severity: 'success', message: `Copied commit ${sha} to the clipboard.` });
      } catch (_error) {
        this.$emit('notify', { severity: 'error', message: 'Could not copy the commit SHA.' });
      }
    },
  },
};
</script>

<template>
  <div class="commits-panel">
    <h2 class="commits-panel__title">Recent commits</h2>
    <ul v-if="commits.length" class="commits-panel__list">
      <li v-for="commit in commits" :key="commit.sha" class="commits-panel__item">
        <span class="commits-panel__avatar" aria-hidden="true">{{ commit.avatar }}</span>
        <div class="commits-panel__body">
          <p class="commits-panel__message">{{ commit.message }}</p>
          <p class="commits-panel__meta">
            <button type="button" class="commits-panel__sha" :title="`Copy ${commit.sha}`" @click="copySha(commit.sha)">
              <m-icon name="copy" :size="12" decorative />
              {{ commit.sha }}
            </button>
            &middot; {{ commit.author }} &middot; {{ commit.when }}
          </p>
        </div>
      </li>
    </ul>
    <p v-else class="commits-panel__empty">No commits yet.</p>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.commits-panel {
  @include card-surface;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commits-panel__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.commits-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commits-panel__item {
  display: flex;
  gap: 10px;
}

.commits-panel__avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--sec);
  color: var(--onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
}

.commits-panel__body {
  min-width: 0;
}

.commits-panel__message {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commits-panel__meta {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: var(--onsurfv);
  display: flex;
  align-items: center;
  gap: 4px;
}

.commits-panel__sha {
  @include focus-ring;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: monospace;
  background: none;
  border: none;
  padding: 0;
  color: var(--onsurfv);
  cursor: pointer;

  &:hover {
    color: var(--onprimc);
  }
}

.commits-panel__empty {
  margin: 0;
  font-size: 13px;
  color: var(--onsurfv);
}
</style>
