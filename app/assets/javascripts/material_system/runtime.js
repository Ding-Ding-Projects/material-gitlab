import { createAppearanceController } from './appearance';
import { createCapabilityRegistry } from './capabilities';
import { createCommandPalette } from './command-palette';
import { createFileConverterRegistry } from './file-converter';
import { createHistoryStore } from './history';
import { createLogoCustomizationModel } from './logo';
import { createNarratorAdapter } from './narrator';
import { createNotificationCenter } from './notifications';
import { createSchoolModeAdapter } from './school-mode';
import { createMaterialSettingsStore } from './settings';
import { createStatusHubAdapter } from './status-hub';
import { createTabWorkspace } from './tabs';
import { createPersonalVocabularyLoader } from './vocabulary';

/**
 * Canonical framework-neutral runtime imported by every page wave. Renderers
 * bind these stores to local Vue components instead of creating global state.
 */
export function createMaterialSystemRuntime(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const target = options.target ?? globalThis;
  const history = options.history || createHistoryStore({ storage, ...options.historyOptions });
  const settings =
    options.settings ||
    createMaterialSettingsStore({ storage, target, ...options.settingsOptions });
  const schoolMode =
    options.schoolMode ||
    createSchoolModeAdapter({
      storage,
      target,
      unlockAdapter: options.schoolModeUnlockAdapter,
      ...options.schoolModeOptions,
    });
  const appearance =
    options.appearance ||
    createAppearanceController({
      storage,
      settingsStore: settings,
      history,
      ...options.appearanceOptions,
    });
  const notifications =
    options.notifications || createNotificationCenter(options.notificationOptions);
  const vocabulary =
    options.vocabulary || createPersonalVocabularyLoader({ storage, ...options.vocabularyOptions });
  const commandPalette =
    options.commandPalette || createCommandPalette({ target, ...options.commandPaletteOptions });
  const tabs = options.tabs || createTabWorkspace({ storage, ...options.tabOptions });
  const statusHub =
    options.statusHub ||
    createStatusHubAdapter({
      adapter: options.statusHubAdapter,
      project: options.statusHubProject,
    });
  const narrator = options.narrator || createNarratorAdapter(options.narratorOptions);
  const capabilities =
    options.capabilities || createCapabilityRegistry({ adapters: options.capabilityAdapters });
  const logo =
    options.logo ||
    createLogoCustomizationModel({
      storage,
      decoder: options.logoDecoder,
      converter: options.logoConverter,
      presets: options.logoPresets,
      ...options.logoOptions,
    });
  const fileConverter =
    options.fileConverter ||
    createFileConverterRegistry({
      adapters: options.fileConverterAdapters,
      ...options.fileConverterOptions,
    });

  const runtime = {
    settings,
    schoolMode,
    appearance,
    notifications,
    vocabulary,
    commandPalette,
    tabs,
    history,
    statusHub,
    narrator,
    capabilities,
    logo,
    fileConverter,
    snapshot: () => ({
      settings: settings.snapshot(),
      schoolMode: schoolMode.snapshot(),
      appearance: appearance.snapshot(),
      notifications: notifications.snapshot(),
      vocabulary: vocabulary.snapshot(),
      commandPalette: commandPalette.snapshot(),
      tabs: tabs.snapshot(),
      history: history.snapshot(),
      statusHub: statusHub.snapshot(),
      narrator: narrator.snapshot(),
      capabilities: capabilities.snapshot(),
      logo: logo.snapshot(),
      fileConverter: fileConverter.snapshot(),
    }),
    dispose() {
      [
        appearance,
        notifications,
        vocabulary,
        commandPalette,
        tabs,
        history,
        statusHub,
        narrator,
        capabilities,
        logo,
        settings,
        schoolMode,
      ].forEach((service) => service.dispose?.());
    },
  };
  return Object.freeze(runtime);
}
