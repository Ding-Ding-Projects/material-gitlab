export const NARRATOR_LANGUAGES = Object.freeze(['en', 'yue', 'both']);
export const NARRATOR_LIMITS = Object.freeze({
  rateMin: 0.1,
  rateMax: 10,
  pitchMin: 0,
  pitchMax: 2,
  queue: 50,
  text: 2000,
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const voiceId = (voice) => voice?.voiceURI || `${voice?.lang || ''}:${voice?.name || ''}`;

export function createNarratorAdapter({
  synthesis = globalThis.speechSynthesis,
  utteranceFactory = (text) => new globalThis.SpeechSynthesisUtterance(text),
  limits = NARRATOR_LIMITS,
} = {}) {
  const listeners = new Set();
  let queue = [];
  let speaking = false;
  let voices = [];
  let state = {
    status: synthesis ? 'ready' : 'unavailable',
    reason: synthesis ? null : 'Speech synthesis is not available',
    enabled: false,
    language: 'en',
    voiceEnglish: null,
    voiceCantonese: null,
    rate: 1,
    pitch: 1,
  };
  const snapshot = () => ({
    ...clone(state),
    voices: voices.map((voice) => ({
      id: voiceId(voice),
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService !== false,
      default: voice.default === true,
    })),
    queued: queue.length,
    speaking,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));

  function refreshVoices() {
    voices = synthesis?.getVoices?.() || [];
    emit();
    return snapshot().voices;
  }

  function selectVoice(language) {
    const selected = language === 'en' ? state.voiceEnglish : state.voiceCantonese;
    const exact = voices.find((voice) => voiceId(voice) === selected);
    if (exact) return exact;
    const prefix = language === 'en' ? /^en(?:-|$)/i : /^(?:yue|zh-HK)(?:-|$)/i;
    return voices.find((voice) => prefix.test(voice.lang || '')) || null;
  }

  function drain() {
    if (!synthesis || speaking || !queue.length || !state.enabled) return;
    const item = queue.shift();
    const utterance = utteranceFactory(item.text);
    utterance.lang = item.language === 'yue' ? 'yue-HK' : 'en';
    utterance.voice = selectVoice(item.language);
    utterance.rate = state.rate;
    utterance.pitch = state.pitch;
    speaking = true;
    utterance.onend = utterance.onerror = () => {
      speaking = false;
      emit();
      drain();
    };
    synthesis.speak(utterance);
    emit();
  }

  const onVoicesChanged = () => refreshVoices();
  synthesis?.addEventListener?.('voiceschanged', onVoicesChanged);
  refreshVoices();

  return Object.freeze({
    snapshot,
    refreshVoices,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    configure(patch = {}) {
      const next = { ...state, ...patch };
      if (!NARRATOR_LANGUAGES.includes(next.language))
        return { ok: false, errors: ['language must be en, yue, or both'] };
      if (!Number.isFinite(next.rate) || next.rate < limits.rateMin || next.rate > limits.rateMax)
        return { ok: false, errors: ['rate is outside the supported range'] };
      if (
        !Number.isFinite(next.pitch) ||
        next.pitch < limits.pitchMin ||
        next.pitch > limits.pitchMax
      )
        return { ok: false, errors: ['pitch is outside the supported range'] };
      state = next;
      emit();
      if (state.enabled) drain();
      return { ok: true, value: snapshot() };
    },
    speak({ english = '', cantonese = '', category = 'information', replaceKey = null } = {}) {
      if (!synthesis)
        return { ok: false, status: 'unavailable', reason: 'Speech synthesis is not available' };
      if (!state.enabled) return { ok: false, status: 'disabled', reason: 'Narrator is disabled' };
      const items = [];
      if ((state.language === 'en' || state.language === 'both') && english)
        items.push({
          text: String(english).slice(0, limits.text),
          language: 'en',
          category,
          replaceKey,
        });
      if ((state.language === 'yue' || state.language === 'both') && cantonese)
        items.push({
          text: String(cantonese).slice(0, limits.text),
          language: 'yue',
          category,
          replaceKey,
        });
      if (replaceKey) queue = queue.filter((item) => item.replaceKey !== replaceKey);
      queue = [...queue, ...items].slice(-limits.queue);
      drain();
      return { ok: true, queued: items.length };
    },
    stop() {
      queue = [];
      synthesis?.cancel?.();
      speaking = false;
      emit();
      return { ok: true };
    },
    dispose() {
      synthesis?.removeEventListener?.('voiceschanged', onVoicesChanged);
      synthesis?.cancel?.();
      queue = [];
      listeners.clear();
    },
  });
}
