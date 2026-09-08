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
      :can-change-visibility="canChangeVisibility"
      :allowed-visibility-levels="allowedVisibilityLevels"
      @update:project-name="$emit('update:project-name', $event)"
      @update:visibility="$emit('update:visibility', $event)"
    />
    <ProjectLogoCard
      v-if="visible.logo"
      :logo-color="logoColor"
      :logo-letter="logoLetter"
      :logo-file-name="logoFileName"
      :logo-url="logoUrl"
      :production="production"
      :avatar-removal="avatarRemoval"
      @update:logo-color="$emit('update:logo-color', $event)"
      @upload-logo="$emit('upload-logo', $event)"
    />
    <DescriptionTopicsCard v-if="visible.description" :description="description" :topics="topics" :busy="busy" @save="$emit('save-description-topics', $event)" />
    <BadgesCard v-if="visible.badges && adapter && adapter.loadBadges" :adapter="adapter" />
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

    <p v-if="!Object.values(visible).some(Boolean)" class="st-empty">
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
import DescriptionTopicsCard from './DescriptionTopicsCard.vue';
import BadgesCard from './BadgesCard.vue';
import { createMatcher } from '../data';

const CARD_KEYWORDS = {
  project: ['Project', 'Project name', 'Visibility'],
  logo: ['Project avatar & logo', 'Logo', 'Avatar'],
  vocabulary: ['Personal vocabulary', 'Vocabulary'],
  converter: ['Local file converter', 'File converter', 'Convert'],
  description: ['Description and topics', 'Project description', 'Topics'],
  badges: ['Project badges', 'Badge', 'Image URL', 'Link URL'],
};

export default {
  name: 'GeneralTab',
  components: { SearchField, ProjectDetailsCard, ProjectLogoCard, VocabularyCard, FileConverterCard, DescriptionTopicsCard, BadgesCard },
  props: {
    projectName: { type: String, required: true },
    visibility: { type: String, required: true },
    logoColor: { type: String, required: true },
    logoLetter: { type: String, required: true },
    logoFileName: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    production: { type: Boolean, default: false },
    description: { type: String, default: '' },
    topics: { type: Array, default: () => [] },
    busy: { type: Boolean, default: false },
    adapter: { type: Object, default: null },
    avatarRemoval: { type: Object, default: () => ({}) },
    canChangeVisibility: { type: Boolean, default: true },
    allowedVisibilityLevels: { type: Array, default: () => [0, 10, 20] },
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
