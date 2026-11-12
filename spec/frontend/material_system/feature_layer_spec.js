import { mount } from '@vue/test-utils';
import { createAdhdModes } from '~/material_system/features/flags';
import { t } from '~/material_system/features/i18n';
import { applyToDocument } from '~/material_system/features/document';
import { rollDimSum, dishAt } from '~/material_system/features/dim-sum';
import { createFeatureState } from '~/material_system/features/state';
import TopbarFeatures from '~/material_system/surfaces/FeatureLayer/TopbarFeatures.vue';
import FeatureLayer from '~/material_system/surfaces/FeatureLayer/FeatureLayer.vue';
import { createNotificationCenter } from '~/material_system/notifications';
import MoreFeatures from '~/material_system/surfaces/FeatureLayer/MoreFeatures.vue';
import { createExtensionHost } from '~/material_system/features/extensions';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m };
};
const tid = (w, id) => w.find(`[data-testid="${id}"]`);

describe('flag stores', () => {
  it('defaults off, persists, and rejects unknown names or wrong types', () => {
    const storage = mem();
    const s = createAdhdModes({ storage });
    expect(Object.values(s.get()).every((v) => v === false)).toBe(true);
    expect(s.set('focus', true)).toBe(true);
    expect(s.set('nope', true)).toBe(false);
    expect(s.set('focus', 'yes')).toBe(false);
    expect(createAdhdModes({ storage }).get().focus).toBe(true);
    expect(createAdhdModes({ storage }).get().momentum).toBe(false);
  });
});

describe('i18n', () => {
  it('returns English, Cantonese and bilingual', () => {
    expect(t('back', 'en')).toBe('Back');
    expect(t('back', 'yue')).toBe('上一步');
    expect(t('back', 'bilingual')).toBe('Back · 上一步');
    expect(t('stepOf', 'en', { n: 2, total: 4 })).toBe('Step 2 of 4');
  });
});

describe('applyToDocument', () => {
  it('writes attributes the stylesheets read', () => {
    const root = document.createElement('html');
    applyToDocument(
      {
        settings: {
          motion: 'full',
          density: 'spacious',
          language: 'yue',
          fontScale: 1.2,
          accentColor: '#123456',
        },
        adhd: { focus: true, lowStimulation: true },
        a11y: { highContrast: true },
      },
      root,
    );
    expect(root.getAttribute('data-m3-motion')).toBe('reduced');
    expect(root.getAttribute('data-m3-focus')).toBe('on');
    expect(root.getAttribute('data-m3-high-contrast')).toBe('on');
    expect(root.getAttribute('data-m3-density')).toBe('spacious');
    expect(root.style.fontSize).toBe('120%');
    applyToDocument({ settings: { fontScale: 1 }, adhd: {}, a11y: {} }, root);
    expect(root.hasAttribute('data-m3-focus')).toBe(false);
    expect(root.style.fontSize).toBe('');
  });
});

describe('dim sum', () => {
  it('fires only below the 10% roll and never when blocked', () => {
    expect(rollDimSum({ random: () => 0.5 })).toBeNull();
    const seq = [0.05, 0];
    expect(rollDimSum({ random: () => seq.shift() })).toEqual(dishAt(0));
    expect(rollDimSum({ random: () => 0, blocked: true })).toBeNull();
    expect(dishAt(0).image).toMatch(
      /^https:\/\/github.com\/Ding-Ding-Projects\/dim-sum-photos\/releases\/download\/catalog-v1\/hk-dish-0001/,
    );
    expect(dishAt(0).zh).toBe('蝦餃');
  });
});

const mkFeature = (storage = mem()) =>
  createFeatureState({ storage, root: document.createElement('html'), target: new EventTarget() });

describe('TopbarFeatures', () => {
  it('switches language and persists through the shared state', async () => {
    const storage = mem();
    const feature = mkFeature(storage);
    const w = mount(TopbarFeatures, { propsData: { feature } });
    await tid(w, 'language-yue').trigger('click');
    expect(feature.state.settings.language).toBe('yue');
    expect(tid(w, 'a11y-button').text()).toContain('無障礙');
    expect(JSON.parse(storage.getItem('material-system.settings.v1')).language).toBe('yue');
  });
  it('accessibility menu is visible by default and toggles a tool', async () => {
    const feature = mkFeature();
    const w = mount(TopbarFeatures, { propsData: { feature }, attachTo: document.body });
    await tid(w, 'a11y-button').trigger('click');
    const box = tid(w, 'a11y-highContrast');
    box.element.checked = true;
    await box.trigger('change');
    expect(feature.state.a11y.highContrast).toBe(true);
    w.destroy();
  });
  it('ADHD modes are independent and show the timer and next chip', async () => {
    const feature = mkFeature();
    const w = mount(TopbarFeatures, { propsData: { feature }, attachTo: document.body });
    await tid(w, 'adhd-button').trigger('click');
    const time = tid(w, 'adhd-timeAwareness');
    time.element.checked = true;
    await time.trigger('change');
    expect(feature.state.adhd.timeAwareness).toBe(true);
    expect(feature.state.adhd.focus).toBe(false);
    await w.vm.$nextTick();
    expect(tid(w, 'adhd-timer').text()).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(tid(w, 'adhd-next').exists()).toBe(false);
    w.destroy();
  });
});

describe('FeatureLayer', () => {
  const mkSync = (opts = {}) =>
    mount(FeatureLayer, {
      propsData: {
        feature: opts.feature || mkFeature(),
        notifications: createNotificationCenter(),
        random: opts.random || (() => 0.99),
        autoSetup: opts.autoSetup ?? false,
      },
    });
  const mk = async (opts) => {
    const w = mkSync(opts);
    await w.vm.$nextTick();
    return w;
  };
  it('renders the features rail and opens the hub on a tab', async () => {
    const w = await mk();
    expect(tid(w, 'features-rail').exists()).toBe(true);
    await tid(w, 'open-feature-hub').trigger('click');
    expect(tid(w, 'feature-hub').exists()).toBe(true);
    expect(tid(w, 'setup-wizard').exists()).toBe(true);
  });
  it('auto-opens setup on first run and resumes at the saved step', async () => {
    const storage = mem();
    const f1 = mkFeature(storage);
    const w = await mk({ feature: f1, autoSetup: true });
    expect(tid(w, 'setup-wizard').exists()).toBe(true);
    await tid(w, 'setup-next').trigger('click');
    expect(tid(w, 'setup-step-title').text()).toContain('Pick a look');
    await tid(w, 'setup-later').trigger('click');
    expect(tid(w, 'feature-hub').exists()).toBe(false);
    const f2 = mkFeature(storage);
    expect(f2.state.setup.step).toBe(1);
    const w2 = await mk({ feature: f2, autoSetup: true });
    expect(tid(w2, 'feature-hub').exists()).toBe(false);
    await tid(w2, 'open-feature-hub').trigger('click');
    expect(tid(w2, 'setup-step-title').text()).toContain('Pick a look');
  });
  it('skips optional steps, goes back, and finishing closes the hub and marks complete', async () => {
    const feature = mkFeature();
    const w = await mk({ feature, autoSetup: true });
    await tid(w, 'setup-language-bilingual').trigger('click');
    expect(feature.state.settings.language).toBe('bilingual');
    await tid(w, 'setup-next').trigger('click');
    await tid(w, 'setup-skip').trigger('click');
    await tid(w, 'setup-back').trigger('click');
    await tid(w, 'setup-skip').trigger('click');
    await tid(w, 'setup-skip').trigger('click');
    expect(feature.state.setup.skipped).toEqual(['appearance', 'access']);
    await tid(w, 'setup-finish').trigger('click');
    expect(feature.state.setup.completed).toBe(true);
    expect(tid(w, 'feature-hub').exists()).toBe(false);
  });
  it('dim sum card appears on a winning roll and cannot be switched off', async () => {
    const seq = [0.01, 0.5];
    const w = await mk({ random: () => seq.shift() ?? 0.5 });
    expect(tid(w, 'dim-sum-card').exists()).toBe(true);
    await tid(w, 'open-feature-hub').trigger('click');
    await tid(w, 'hub-tab-dimsum').trigger('click');
    await tid(w, 'dim-sum-switch').trigger('click');
    expect(tid(w, 'dim-sum-switch').element.checked).toBe(true);
    expect(tid(w, 'dim-sum-notice').text()).toContain('Nice try');
  });
  it('hiding the accessibility menu from the hub is reversible', async () => {
    const feature = mkFeature();
    const w = await mk({ feature });
    await tid(w, 'open-feature-hub').trigger('click');
    await tid(w, 'hub-tab-accessibility').trigger('click');
    const box = tid(w, 'hub-a11y-menuHidden');
    box.element.checked = true;
    await box.trigger('change');
    expect(feature.state.a11y.menuHidden).toBe(true);
    box.element.checked = false;
    await box.trigger('change');
    expect(feature.state.a11y.menuHidden).toBe(false);
  });
});

const flush = async () => {
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 5));
};
const more = (feature, tab) => mount(MoreFeatures, { propsData: { feature, tab } });

describe('MoreFeatures', () => {
  it('School mode needs a PIN to turn off and forces English', async () => {
    const feature = mkFeature();
    feature.setSetting({ language: 'yue' });
    const w = more(feature, 'school');
    await tid(w, 'school-pin').setValue('12');
    await tid(w, 'school-toggle').trigger('click');
    await flush();
    expect(feature.state.school.enabled).toBe(false);
    expect(tid(w, 'school-error').exists()).toBe(true);
    await tid(w, 'school-pin').setValue('2468');
    await tid(w, 'school-toggle').trigger('click');
    await flush();
    await flush();
    expect(feature.state.school.enabled).toBe(true);
    expect(feature.state.lang).toBe('en');
    await tid(w, 'school-pin').setValue('1111');
    await tid(w, 'school-toggle').trigger('click');
    await flush();
    await flush();
    expect(feature.state.school.enabled).toBe(true);
    await tid(w, 'school-pin').setValue('2468');
    await tid(w, 'school-toggle').trigger('click');
    await flush();
    await flush();
    expect(feature.state.school.enabled).toBe(false);
    expect(feature.state.lang).toBe('yue');
  });
  it('personal wording replaces labels by key and clears', async () => {
    const feature = mkFeature();
    const r = feature.loadWording(
      JSON.stringify({
        schemaVersion: 1,
        entries: [{ language: 'en', key: 'back', value: 'Go back' }],
      }),
    );
    expect(r.ok).toBe(true);
    await flush();
    expect(t('back', 'en')).toBe('Go back');
    feature.clearWording();
    await flush();
    expect(t('back', 'en')).toBe('Back');
    expect(
      feature.loadWording('{"schemaVersion":1,"entries":[{"language":"xx","key":"a","value":"b"}]}')
        .ok,
    ).toBe(false);
  });
  it('rename changes the display name only, and reset restores it', async () => {
    const feature = mkFeature();
    const w = more(feature, 'name');
    await tid(w, 'display-name').setValue('Ding Ding Forge');
    await tid(w, 'display-name-save').trigger('click');
    expect(feature.state.displayName).toBe('Ding Ding Forge');
    feature.rename('');
    expect(feature.state.displayName).toBe('Material GitLab');
  });
  it('color translator shows RGB, HSL and contrast for the seed', async () => {
    const feature = mkFeature();
    const w = more(feature, 'color');
    await tid(w, 'color-hex').setValue('#FFFFFF');
    await tid(w, 'color-hex').trigger('change');
    expect(feature.state.settings.accentColor).toBe('#FFFFFF');
    expect(tid(w, 'color-rgb').text()).toBe('rgb(255, 255, 255)');
    expect(tid(w, 'color-contrast').text()).toContain('1:1');
    await tid(w, 'color-hex').setValue('#000000');
    await tid(w, 'color-hex').trigger('change');
    expect(tid(w, 'color-contrast').text()).toContain('21:1');
  });
  it('extensions can be searched and switched off', async () => {
    const feature = mkFeature();
    const w = more(feature, 'extensions');
    await tid(w, 'extensions-search').setValue('clipboard');
    expect(w.findAll('[role="switch"]').length).toBe(1);
    const sw = tid(w, 'extension-copy-sha');
    sw.element.checked = false;
    await sw.trigger('change');
    expect(feature.state.extensions.find((e) => e.id === 'copy-sha').enabled).toBe(false);
  });
});

describe('extension host', () => {
  it('runs built-ins and stops one when disabled', () => {
    const host = createExtensionHost({ storage: mem(), target: new EventTarget() });
    const doc = document.implementation.createHTMLDocument('x');
    host.start({ doc, notify: () => {} });
    expect(host.isRunning('copy-sha')).toBe(true);
    host.setEnabled('copy-sha', false);
    expect(host.isRunning('copy-sha')).toBe(false);
  });
});
