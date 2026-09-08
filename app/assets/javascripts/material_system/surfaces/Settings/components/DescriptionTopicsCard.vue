<template>
  <gl-form class="st-card" data-screen-label="Description and topics" @submit.prevent="save">
    <h2 class="st-card__title">Description and topics</h2>
    <gl-form-group label="Project description" label-for="st-project-description">
      <gl-form-textarea id="st-project-description" v-model="draftDescription" :disabled="busy" :rows="4" />
    </gl-form-group>
    <gl-form-group label="Topics" label-for="st-project-topics" description="Separate topic names with commas.">
      <gl-form-input id="st-project-topics" v-model="draftTopics" :disabled="busy" />
    </gl-form-group>
    <gl-button type="submit" variant="confirm" :disabled="busy">Save description and topics</gl-button>
  </gl-form>
</template>

<script>
import { GlButton, GlForm, GlFormGroup, GlFormInput, GlFormTextarea } from '@gitlab/ui';

export default {
  name: 'DescriptionTopicsCard',
  components: { GlButton, GlForm, GlFormGroup, GlFormInput, GlFormTextarea },
  props: {
    description: { type: String, default: '' },
    topics: { type: Array, default: () => [] },
    busy: { type: Boolean, default: false },
  },
  data() { return { draftDescription: this.description, draftTopics: this.topics.join(', ') }; },
  watch: {
    description(value) { this.draftDescription = value; },
    topics(value) { this.draftTopics = value.join(', '); },
  },
  methods: {
    save() {
      if (!this.busy) this.$emit('save', { description: this.draftDescription, topics: [...new Set(this.draftTopics.split(',').map((topic) => topic.trim()).filter(Boolean))] });
    },
  },
};
</script>
