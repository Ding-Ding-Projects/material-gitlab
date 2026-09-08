<template>
  <div class="mr-comment-composer">
    <label for="mr-comment-input" class="mr-sr-only">Write a comment</label>
    <material-text-field
      id="mr-comment-input"
      :value="value"
      type="text"
      class="mr-comment-composer__input"
      placeholder="Write a comment…"
      @input="$emit('input', $event)"
      @keydown.enter="submit"
    aria-label="Write a comment" />
    <material-button variant="filled" type="button" class="mr-comment-composer__submit" :disabled="!value.trim()" @click="submit">
      <span class="material-symbols-outlined" style="font-size: 18px" aria-hidden="true">send</span>
      Comment
    </material-button>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';
import MaterialTextField from '~/material_system/components/material_text_field';

export default {
  components: { MaterialButton, MaterialTextField },
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
