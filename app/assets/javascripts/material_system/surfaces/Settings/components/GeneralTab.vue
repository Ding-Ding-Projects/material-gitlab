<template>
  <div id="st-tabpanel-general" role="tabpanel" aria-labelledby="st-tab-general" class="st-tab-panel">
    <SearchField
      :value="search"
      placeholder="Search general settings"
      label="Search general settings"
      :regex-mode="regexMode"
      :regex-open="regexOpen"
      :valid="matcher.valid"
      :error="matcher.error"
      :corpus="cardTitles"
      corpus-title="General settings"
      @input="search = $event"
      @toggle-regex="regexMode = !regexMode"
      @toggle-builder="regexOpen = !regexOpen"
      @apply-regex="onApplyRegex"
    />

    <ProjectDetailsCard
      v-if="visible.project"
      :project-name="projectName"
      :visibility="visibility"
      @update:project-name="$emit('update:project-name', $event)"
      @update:visibility="$emit('update:visibility', $event)"
    />
    <ProjectLogoCard
      v-if="visible.logo"
      :logo-color="logoColor"
      :logo-letter="logoLetter"
      :logo-file-name="logoFileName"
      @update:logo-color="$emit('update:logo-color', $event)"
      @upload-logo="$emit('upload-logo', $event)"
    />
    <VocabularyCard
      v-if="visible.vocabulary"
      :status="vocabularyStatus"
      :ok="vocabularyOk"
      @vocabulary-loaded="$emit('vocabulary-loaded', $event)"
    />
    <FileConverterCard
      v-if="visible.converter"
      :status="converterStatus"
      @file-chosen="$emit('file-chosen', $event)"
    />

    <p v-if="!visible.project && !visible.logo && !visible.vocabulary && !visible.converter" class="st-empty">
      No general settings match "{{ search }}".
    </p>
  </div>
</template>

<script>
import SearchField from './SearchField.vue';
import ProjectDetailsCard from './ProjectDetailsCard.vue';
import ProjectLogoCard from './ProjectLogoCard.vue';
import VocabularyCard from './VocabularyCard.vue';
import FileConverterCard from './FileConverterCard.vue';
import { createMatcher } from '../data';

const CARD_KEYWORDS = {
  project: ['Project', 'Project name', 'Visibility'],
  logo: ['Project avatar & logo', 'Logo', 'Avatar'],
  vocabulary: ['Personal vocabulary', 'Vocabulary'],
  converter: ['Local file converter', 'File converter', 'Convert'],
};

export default {
  name: 'GeneralTab',
  components: { SearchField, ProjectDetailsCard, ProjectLogoCard, VocabularyCard, FileConverterCard },
  props: {
    projectName: { type: String, required: true },
    visibility: { type: String, required: true },
    logoColor: { type: String, required: true },
    logoLetter: { type: String, required: true },
    logoFileName: { type: String, default: '' },
    vocabularyStatus: { type: String, required: true },
    vocabularyOk: { type: Boolean, default: null },
    converterStatus: { type: String, required: true },
  },
  data() {
    return {
      search: '',
      regexMode: false,
      regexOpen: false,
      cardTitles: Object.values(CARD_KEYWORDS).map((words) => words[0]),
    };
  },
  computed: {
    matcher() {
      return createMatcher(this.search, { regexMode: this.regexMode });
    },
    visible() {
      const result = {};
      for (const [key, words] of Object.entries(CARD_KEYWORDS)) {
        result[key] = words.some((word) => this.matcher.test(word));
      }
      return result;
    },
  },
  methods: {
    onApplyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.st-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
