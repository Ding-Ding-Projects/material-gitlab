<template>
  <gl-form class="st-card" data-screen-label="Description and topics" @submit.prevent="save">
    <h2 class="st-card__title">Description and topics</h2>
    <gl-form-group label="Project description" label-for="st-project-description">
      <MaterialTextField id="st-project-description" v-model="draftDescription" type="textarea" aria-label="Project description" :disabled="busy" :rows="4" />
    </gl-form-group>
    <gl-form-group label="Topics" label-for="st-project-topics" description="Separate topic names with commas.">
      <MaterialTextField id="st-project-topics" v-model="draftTopics" aria-label="Topics" :disabled="busy" />
    </gl-form-group>
    <MaterialButton type="submit" variant="filled" :disabled="busy">Save description and topics</MaterialButton>
  </gl-form>
</template>

<script>
import { GlForm, GlFormGroup } from '@gitlab/ui';
import MaterialButton from '~/material_system/components/material_button';
import MaterialTextField from '~/material_system/components/material_text_field';

export default {
  name: 'DescriptionTopicsCard',
  components: { GlForm, GlFormGroup, MaterialButton, MaterialTextField },
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
