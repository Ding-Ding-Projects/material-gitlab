<template>
  <div class="mr-comment-composer">
    <label for="mr-comment-input" class="mr-sr-only">Write a comment</label>
    <input
      id="mr-comment-input"
      :value="value"
      type="text"
      class="mr-comment-composer__input"
      placeholder="Write a comment…"
      @input="$emit('input', $event.target.value)"
      @keydown.enter="submit"
    />
    <button type="button" class="mr-comment-composer__submit" :disabled="!value.trim()" @click="submit">
      <span class="material-symbols-outlined" style="font-size: 18px" aria-hidden="true">send</span>
      Comment
    </button>
  </div>
</template>

<script>
export default {
  name: 'MrCommentComposer',
  props: {
    value: { type: String, required: true },
  },
  methods: {
    submit() {
      if (!this.value.trim()) return;
      this.$emit('submit');
    },
  },
};
</script>
