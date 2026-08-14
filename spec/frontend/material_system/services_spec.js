import {
  createAppearanceController,
  createHistoryStore,
  createNarratorAdapter,
  createPersonalVocabularyLoader,
  createTabWorkspace,
  parseVocabularyJson,
} from '~/material_system';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: jest.fn((key) => values.get(key) ?? null),
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: jest.fn((key) => values.delete(key)),
  };
};

describe('Material System page services', () => {
  it('rejects duplicate and unsafe vocabulary keys without partially applying them', () => {
    expect(parseVocabularyJson('{"schemaVersion":1,"entries":[],"entries":[]}')).toMatchObject({
      ok: false,
    });
    expect(
      parseVocabularyJson(
        '{"schemaVersion":1,"entries":[{"language":"en","key":"__proto__","value":"unsafe"}]}',
      ),
    ).toMatchObject({
      ok: false,
    });

    const loader = createPersonalVocabularyLoader({ storage: createStorage() });
    expect(
      loader.load('{"schemaVersion":1,"entries":[{"language":"en","key":"hello","value":"Hi"}]}'),
    ).toMatchObject({ ok: true });
    expect(loader.translate('hello', 'en', 'Hello')).toBe('Hi');
    expect(loader.load('{"schemaVersion":1,"entries":[],"entries":[]}')).toMatchObject({
      ok: false,
    });
    expect(loader.translate('hello', 'en', 'Hello')).toBe('Hi');
    expect(loader.translate('hello', 'en', 'Hello', { schoolMode: true })).toBe('Hello');
    loader.clear();
    expect(loader.translate('hello', 'en', 'Hello')).toBe('Hello');
  });

  it('redacts secret-shaped history metadata before persistence', () => {
    const history = createHistoryStore({
      storage: createStorage(),
      clock: () => '2023-11-14T22:13:20.000Z',
    });

    history.record({
      action: 'settings-changed',
      targetId: 'settings.narrator',
      summary: 'Changed narrator settings',
      metadata: { language: 'en', accessToken: 'never-store-this' },
    });

    expect(history.snapshot().entries[0].metadata).toEqual({
      language: 'en',
      accessToken: '[redacted]',
    });
  });

  it('provides four independent tab discovery searches and protects pinned or unsaved tabs', () => {
    const tabs = createTabWorkspace({ storage: createStorage(), workspaceId: 'projects' });
    tabs.createGroup({ id: 'group.review', name: 'Review' });
    tabs.addTab({ id: 'tab.one', title: 'Project one', pinned: true });
    tabs.addTab({ id: 'tab.two', title: 'Project two', groupId: 'group.review', unsaved: true });

    expect(tabs.setSearch('strip', null, { pattern: 'Project' }).results).toHaveLength(2);
    expect(tabs.setSearch('group', 'group.review', { pattern: 'two' }).results).toHaveLength(1);
    expect(tabs.setSearch('groups', null, { pattern: 'Review' }).results).toHaveLength(1);
    expect(tabs.setSearch('master', null, { pattern: 'Project' }).results).toHaveLength(2);
    expect(tabs.previewBulkClose({ scope: 'master' })).toMatchObject({
      count: 1,
      excludedPinned: ['tab.one'],
      requiresConfirmation: true,
    });
    expect(tabs.removeTab('tab.two')).toMatchObject({ status: 'confirmation-required' });
  });

  it('exposes keyboard-operable appearance actions for an exact stable element id', () => {
    const storage = createStorage();
    const appearance = createAppearanceController({ storage });
    const onEdit = jest.fn();
    const onLock = jest.fn();
    const actions = appearance.contextActions('element.project-card', { onEdit, onLock });

    expect(actions.map(({ id, label, shortcut }) => ({ id, label, shortcut }))).toEqual([
      { id: 'appearance.edit', label: 'Edit appearance…', shortcut: 'Shift+F10' },
      { id: 'appearance.lock', label: 'Lock this element…', shortcut: undefined },
    ]);
    actions[0].run();
    actions[1].run();
    expect(onEdit).toHaveBeenCalledWith('element.project-card');
    expect(onLock).toHaveBeenCalledWith('element.project-card');
    expect(appearance.contextActions('project-card')).toEqual([]);
    appearance.dispose();
  });

  it('serializes English and Cantonese narration and removes its voice listener on teardown', () => {
    const utterances = [];
    const synthesis = {
      getVoices: jest.fn(() => []),
      speak: jest.fn(),
      cancel: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const narrator = createNarratorAdapter({
      synthesis,
      utteranceFactory: (text) => {
        const utterance = { text };
        utterances.push(utterance);
        return utterance;
      },
    });
    narrator.configure({ enabled: true, language: 'both' });

    expect(narrator.speak({ english: 'Ready', cantonese: '準備好' })).toEqual({
      ok: true,
      queued: 2,
    });
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(utterances[0]).toMatchObject({ text: 'Ready', lang: 'en' });
    utterances[0].onend();
    expect(synthesis.speak).toHaveBeenCalledTimes(2);
    expect(utterances[1]).toMatchObject({ text: '準備好', lang: 'yue-HK' });

    narrator.dispose();
    expect(synthesis.removeEventListener).toHaveBeenCalledWith(
      'voiceschanged',
      expect.any(Function),
    );
  });
});
