<template>
  <div
    id="mr-tabpanel-discussion"
    class="mr-discussion"
    role="tabpanel"
    aria-labelledby="mr-tab-discussion"
    tabindex="0"
  >
    <p v-if="!mr.threads.length" class="mr-list__empty">No comments yet — start the discussion below.</p>
    <mr-thread-card
      v-for="(thread, index) in mr.threads"
      :key="index"
      :thread="thread"
      @toggle-resolve="$emit('toggle-resolve', index)"
    />
    <mr-comment-composer
      :value="comment"
      @input="$emit('update:comment', $event)"
      @submit="$emit('add-comment')"
    />
  </div>
</template>

<script>
import MrThreadCard from './MrThreadCard.vue';
import MrCommentComposer from './MrCommentComposer.vue';

export default {
  name: 'MrDiscussionTab',
  components: { MrThreadCard, MrCommentComposer },
  props: {
    mr: { type: Object, required: true },
    comment: { type: String, required: true },
  },
};
</script>
