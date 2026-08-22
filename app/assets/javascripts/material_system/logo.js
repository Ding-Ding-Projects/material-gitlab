export const LOGO_STORAGE_KEY = 'material-system.logo.v1';
export const LOGO_LIMITS = Object.freeze({
  bytes: 5 * 1024 * 1024,
  pixels: 16 * 1024 * 1024,
  frames: 1,
  dimension: 4096,
});
export const LOGO_MIME_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

const clone = (value) => JSON.parse(JSON.stringify(value));
const DEFAULT_TRANSFORM = Object.freeze({
  fit: 'contain',
  focalX: 0.5,
  focalY: 0.5,
  crop: null,
  background: 'transparent',
});

export function createLogoCustomizationModel({
  storage = globalThis.localStorage,
  decoder = null,
  converter = null,
  presets = [],
  limits = LOGO_LIMITS,
} = {}) {
  const presetMap = new Map();
  const listeners = new Set();
  let state = {
    status: 'preset',
    selectedPresetId: null,
    custom: null,
    transform: clone(DEFAULT_TRANSFORM),
    error: null,
  };
  const snapshot = () => clone(state);
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const persist = () => {
    try {
      storage?.setItem?.(LOGO_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_error) {
      return false;
    }
  };

  const api = Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    registerPreset(preset) {
      if (
        !preset ||
        typeof preset.id !== 'string' ||
        !preset.id ||
        typeof preset.label !== 'string' ||
        !preset.label ||
        typeof preset.src !== 'string' ||
        !preset.src
      )
        throw new Error('Logo preset requires id, label, and src');
      presetMap.set(preset.id, { ...preset, targets: [...(preset.targets || [])] });
      if (!state.selectedPresetId) state.selectedPresetId = preset.id;
      return () => presetMap.delete(preset.id);
    },
    selectPreset(id) {
      if (!presetMap.has(id))
        return { ok: false, status: 'missing', reason: `Unknown logo preset: ${id}` };
      state = {
        status: 'preset',
        selectedPresetId: id,
        custom: null,
        transform: clone(DEFAULT_TRANSFORM),
        error: null,
      };
      if (!persist())
        return {
          ok: false,
          status: 'unavailable',
          reason: 'Logo selection could not be persisted',
        };
      emit();
      return { ok: true, value: snapshot() };
    },
    async loadCustom({ bytes, mimeType } = {}) {
      const byteCount = bytes?.byteLength;
      if (!Number.isInteger(byteCount) || byteCount <= 0 || byteCount > limits.bytes)
        return {
          ok: false,
          status: 'invalid',
          reason: `Logo must be between 1 and ${limits.bytes} bytes`,
        };
      if (!LOGO_MIME_TYPES.includes(mimeType))
        return { ok: false, status: 'invalid', reason: 'Logo image type is not supported' };
      if (
        !decoder ||
        typeof decoder.decode !== 'function' ||
        !converter ||
        typeof converter.convert !== 'function'
      )
        return {
          ok: false,
          status: 'unavailable',
          reason: 'Local logo decoder and converter adapters are not registered',
        };
      try {
        const decoded = await decoder.decode({ bytes, mimeType, limits });
        if (
          !decoded ||
          decoded.width <= 0 ||
          decoded.height <= 0 ||
          decoded.width > limits.dimension ||
          decoded.height > limits.dimension ||
          decoded.width * decoded.height > limits.pixels ||
          (decoded.frames || 1) > limits.frames
        )
          return { ok: false, status: 'invalid', reason: 'Decoded logo exceeds image limits' };
        const converted = await converter.convert({
          decoded,
          targets: ['app-bar', 'sidebar', 'favicon'],
          transform: clone(DEFAULT_TRANSFORM),
          limits,
        });
        if (!converted || !Array.isArray(converted.targets) || !converted.targets.length)
          return {
            ok: false,
            status: 'failed',
            reason: 'Logo conversion produced no validated targets',
          };
        state = {
          status: 'custom',
          selectedPresetId: null,
          custom: {
            width: decoded.width,
            height: decoded.height,
            mimeType,
            targets: converted.targets.map(({ id, width, height, format }) => ({
              id,
              width,
              height,
              format,
            })),
          },
          transform: clone(DEFAULT_TRANSFORM),
          error: null,
        };
        if (!persist())
          return {
            ok: false,
            status: 'unavailable',
            reason: 'Custom logo state could not be persisted',
          };
        emit();
        return { ok: true, value: snapshot() };
      } catch (error) {
        return { ok: false, status: 'failed', reason: error.message || 'Logo conversion failed' };
      }
    },
    updateTransform(patch = {}) {
      const next = { ...state.transform, ...clone(patch) };
      if (
        !['contain', 'cover', 'fill'].includes(next.fit) ||
        ![next.focalX, next.focalY].every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1,
        )
      )
        return { ok: false, status: 'invalid', reason: 'Logo transform is invalid' };
      state = { ...state, transform: next };
      if (!persist())
        return {
          ok: false,
          status: 'unavailable',
          reason: 'Logo transform could not be persisted',
        };
      emit();
      return { ok: true, value: snapshot() };
    },
    reset() {
      const first = presetMap.keys().next().value || null;
      state = {
        status: 'preset',
        selectedPresetId: first,
        custom: null,
        transform: clone(DEFAULT_TRANSFORM),
        error: null,
      };
      try {
        storage?.removeItem?.(LOGO_STORAGE_KEY);
      } catch (_error) {
        /* state is still reset */
      }
      emit();
      return { ok: true, value: snapshot() };
    },
    dispose: () => listeners.clear(),
  });

  presets.forEach((preset) => api.registerPreset(preset));
  try {
    const saved = JSON.parse(storage?.getItem?.(LOGO_STORAGE_KEY) || 'null');
    if (saved?.status === 'preset' && presetMap.has(saved.selectedPresetId)) state = saved;
  } catch (_error) {
    /* keep shipped preset */
  }
  return api;
}
