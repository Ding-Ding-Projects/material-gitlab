import {
  DEFAULT_SETTINGS,
  SETTINGS_MAX_BYTES,
  SETTINGS_STORAGE_KEY,
  createMaterialSettingsStore,
  loadSettings,
  migrateSettings,
  saveSettings,
  settingsTokens,
  subscribeSettings,
  updateSettings,
  validateSettings,
} from '~/material_system';

const createStorage = () => {
  const values = new Map();

  return {
    getItem: jest.fn((key) => values.get(key) ?? null),
    setItem: jest.fn((key, value) => values.set(key, value)),
  };
};

describe('Material System settings', () => {
  it('migrates the legacy language and funny level without dropping current defaults', () => {
    expect(migrateSettings({ languageMode: 'bilingual', funnyLevel: 5 })).toEqual({
      ...DEFAULT_SETTINGS,
      language: 'bilingual',
      funnyLevelEnglish: 5,
      funnyLevelCantonese: 5,
    });
  });

  it.each([
    ['language', 'fr'],
    ['funnyLevelEnglish', 0],
    ['funnyLevelCantonese', 6],
    ['showDialogEmojis', 'yes'],
    ['theme', 'sepia'],
    ['density', 'huge'],
    ['accentColor', 'purple'],
    ['fontFamily', ''],
    ['fontScale', 2.1],
    ['motion', 'fast'],
  ])('rejects an invalid %s value', (key, value) => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, [key]: value }).ok).toBe(false);
  });

  it('falls back without applying malformed, oversized, or unsupported persisted data', () => {
    const storage = createStorage();
    storage.getItem
      .mockReturnValueOnce('{')
      .mockReturnValueOnce('x'.repeat(SETTINGS_MAX_BYTES + 1));

    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a validated patch under the stable storage key', () => {
    const storage = createStorage();

    const result = updateSettings({ language: 'yue', density: 'compact', theme: 'dark' }, storage);

    expect(result).toMatchObject({ ok: true, value: { language: 'yue', density: 'compact' } });
    expect(storage.setItem).toHaveBeenCalledWith(
      SETTINGS_STORAGE_KEY,
      expect.stringContaining('"language":"yue"'),
    );
    expect(loadSettings(storage)).toEqual(result.value);
    expect(settingsTokens(result.value)).toMatchObject({
      color: { background: '#1C1B1F' },
      density: { name: 'compact', scale: -1 },
    });
  });

  it('reports unavailable storage instead of claiming persistence', () => {
    expect(saveSettings(DEFAULT_SETTINGS, null)).toEqual({
      ok: false,
      errors: ['storage unavailable'],
    });
  });

  it('subscribes only to the stable storage event and returns a teardown function', () => {
    const storage = createStorage();
    saveSettings({ ...DEFAULT_SETTINGS, language: 'bilingual' }, storage);
    const target = {
      localStorage: storage,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const listener = jest.fn();
    const unsubscribe = subscribeSettings(listener, target);
    const onStorage = target.addEventListener.mock.calls[0][1];

    onStorage({ key: 'unrelated.setting' });
    onStorage({ key: SETTINGS_STORAGE_KEY });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ language: 'bilingual' }));

    unsubscribe();

    expect(target.removeEventListener).toHaveBeenCalledWith('storage', onStorage);
  });

  it('provides a renderer-neutral observable store over the same persistence path', () => {
    const storage = createStorage();
    const target = {
      localStorage: storage,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const store = createMaterialSettingsStore({ storage, target });
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    expect(listener).toHaveBeenNthCalledWith(1, DEFAULT_SETTINGS);
    expect(store.update({ theme: 'dark', density: 'spacious' })).toMatchObject({ ok: true });
    expect(store.snapshot()).toMatchObject({ theme: 'dark', density: 'spacious' });
    expect(store.tokens()).toMatchObject({
      color: { background: '#1C1B1F' },
      density: { name: 'spacious', scale: 1 },
    });

    expect(store.reset()).toMatchObject({ ok: true, value: DEFAULT_SETTINGS });

    unsubscribe();
    store.dispose();

    expect(target.removeEventListener).toHaveBeenCalled();
  });
});
