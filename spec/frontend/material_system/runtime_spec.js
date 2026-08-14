import {
  createCapabilityRegistry,
  createCommandPalette,
  createFileConverterRegistry,
  createMaterialSystemRuntime,
  registerCapabilityAdapter,
} from '~/material_system';

const SERVICE_NAMES = [
  'settings',
  'schoolMode',
  'appearance',
  'notifications',
  'vocabulary',
  'commandPalette',
  'tabs',
  'history',
  'statusHub',
  'narrator',
  'capabilities',
  'logo',
  'fileConverter',
];

describe('Material System aggregate runtime', () => {
  it('uses the injected public services, snapshots them, and tears them down', () => {
    const services = Object.fromEntries(
      SERVICE_NAMES.map((name) => [
        name,
        name === 'fileConverter'
          ? { snapshot: jest.fn(() => ({ service: name })) }
          : {
              snapshot: jest.fn(() => ({ service: name })),
              dispose: jest.fn(),
            },
      ]),
    );

    const runtime = createMaterialSystemRuntime({
      ...services,
      storage: { getItem: jest.fn(), setItem: jest.fn() },
    });

    expect(Object.isFrozen(runtime)).toBe(true);
    SERVICE_NAMES.forEach((name) => expect(runtime[name]).toBe(services[name]));
    expect(runtime.snapshot()).toEqual(
      Object.fromEntries(SERVICE_NAMES.map((name) => [name, { service: name }])),
    );

    runtime.dispose();

    SERVICE_NAMES.filter((name) => name !== 'fileConverter').forEach((name) => {
      expect(services[name].dispose).toHaveBeenCalledTimes(1);
    });
  });

  it('opens the command palette with the documented keyboard shortcut and activates a teleport', async () => {
    const listeners = new Map();
    const target = {
      addEventListener: jest.fn((type, listener) => listeners.set(type, listener)),
      removeEventListener: jest.fn(),
    };
    const action = jest.fn(() => ({ selected: true }));
    const teleport = jest.fn(({ actionResult }) => actionResult.selected);
    const palette = createCommandPalette({ target });
    palette.register({ id: 'command.open-settings', title: 'Open settings', action, teleport });
    const preventDefault = jest.fn();

    expect(
      listeners.get('keydown')({ key: 'f', ctrlKey: true, shiftKey: true, preventDefault }),
    ).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(palette.snapshot().open).toBe(true);

    await expect(palette.activate('command.open-settings')).resolves.toEqual({
      ok: true,
      actionResult: { selected: true },
      teleportResult: true,
    });

    palette.dispose();
    expect(target.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('keeps an unregistered capability unavailable until an exact adapter is registered', async () => {
    const registry = createCapabilityRegistry();

    expect(registry.status('locks')).toEqual({
      id: 'locks',
      status: 'unavailable',
      reason: 'Lock credential adapter is not registered',
    });
    await expect(registry.invoke('locks', 'unlock')).resolves.toMatchObject({
      ok: false,
      status: 'unavailable',
    });
    expect(() => registerCapabilityAdapter(registry, 'locks', { unlock: jest.fn() })).toThrow(
      'locks adapter is missing methods: createLock, removeLock',
    );

    const adapter = {
      createLock: jest.fn(),
      unlock: jest.fn(() => ({ ok: true })),
      removeLock: jest.fn(),
    };
    const unregister = registerCapabilityAdapter(registry, 'locks', adapter, {
      implementation: 'platform-vault',
    });

    await expect(registry.invoke('locks', 'unlock', 'element.toolbar')).resolves.toEqual({
      ok: true,
    });
    expect(adapter.unlock).toHaveBeenCalledWith('element.toolbar');
    expect(registry.status('locks')).toMatchObject({ status: 'available' });
    unregister();
    expect(registry.status('locks')).toMatchObject({ status: 'unavailable' });
  });

  it('lists a claimed converter as unavailable without bundled packaged-artifact proof', () => {
    const registry = createFileConverterRegistry({
      adapters: [
        {
          id: 'converter.image-png-to-jpeg',
          category: 'images',
          sources: [{ mimeType: 'image/png' }],
          targets: ['image/jpeg'],
          available: true,
          bundled: false,
          convert: jest.fn(),
          validateOutput: jest.fn(),
        },
      ],
    });

    expect(registry.getAdapter('converter.image-png-to-jpeg')).toMatchObject({
      available: false,
      status: 'unavailable',
      unavailableReason:
        'Bundled packaged-artifact proof and converter implementation are required',
      reason: 'Bundled packaged-artifact proof and converter implementation are required',
    });
  });
});
