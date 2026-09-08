import Vue from 'vue';
import { mount } from '@vue/test-utils';
import MaterialButton, {
  MATERIAL_BUTTON_VARIANTS,
} from '~/material_system/components/material_button';
import MaterialCheckbox from '~/material_system/components/material_checkbox';
import MaterialRadio from '~/material_system/components/material_radio';
import MaterialSwitch from '~/material_system/components/material_switch';
import { selectionValueEquals } from '~/material_system/components/selection_control';
import {
  assertMaterialWebElement,
  assertMaterialWebRegistration,
  MATERIAL_WEB_CONSTRUCTORS,
} from '~/material_system/components/register';

const settle = async (element) => {
  await Vue.nextTick();
  await Promise.resolve();
  await element.updateComplete;
  await Promise.resolve();
};
const activate = async (element) => {
  await settle(element);
  (element.shadowRoot.querySelector('input, button') || element).click();
  await settle(element);
};

describe('official Material Web selection and button adapters', () => {
  let wrapper;
  beforeEach(() => jest.useRealTimers());
  afterEach(async () => {
    wrapper?.destroy();
    document.body.innerHTML = '';
    await Promise.resolve();
  });

  it('does not accidentally select a string option through object coercion', () => {
    expect(selectionValueEquals({}, '[object Object]')).toBe(false);
    expect(selectionValueEquals(null, 'null')).toBe(false);
    expect(selectionValueEquals(1, '1')).toBe(true);
  });

  it.each([
    ['filled', 'md-filled-button'],
    ['outlined', 'md-outlined-button'],
    ['tonal', 'md-filled-tonal-button'],
    ['elevated', 'md-elevated-button'],
    ['text', 'md-text-button'],
  ])(
    'renders the exact official %s variant with its action, icon slot and disabled behavior',
    async (variant, tag) => {
      const click = jest.fn();
      wrapper = mount(MaterialButton, {
        attachTo: document.body,
        propsData: { variant },
        attrs: { 'aria-label': 'Save project' },
        slots: { default: 'Save', icon: '<svg viewBox="0 0 24 24"></svg>' },
        listeners: { click },
      });
      const element = wrapper.element;
      await settle(element);
      expect(element.localName).toBe(tag);
      expect(element.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS[tag]);
      expect(element.shadowRoot.querySelector('md-ripple')).not.toBeNull();
      expect(element.shadowRoot.querySelector('md-focus-ring')).not.toBeNull();
      expect(element.querySelector('[slot="icon"] svg')).not.toBeNull();
      expect(element.shadowRoot.querySelector('button').getAttribute('aria-label')).toBe(
        'Save project',
      );
      await activate(element);
      expect(click).toHaveBeenCalledTimes(1);
      await wrapper.setProps({ disabled: true });
      await activate(element);
      expect(click).toHaveBeenCalledTimes(1);
    },
  );

  it('changes between real button variants and link anatomy without losing listeners', async () => {
    const click = jest.fn((event) => event.preventDefault());
    wrapper = mount(MaterialButton, {
      attachTo: document.body,
      listeners: { click },
      slots: { default: 'Project' },
    });
    await wrapper.setProps({ variant: 'outlined', href: '/project' });
    await settle(wrapper.element);
    const link = wrapper.element.shadowRoot.querySelector('a');
    expect(wrapper.element.localName).toBe('md-outlined-button');
    expect(link.getAttribute('href')).toBe('/project');
    link.click();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('preserves Boolean checkbox v-model and emits each model/native event once', async () => {
    const nativeChange = jest.fn();
    const input = jest.fn();
    wrapper = mount(
      {
        components: { MaterialCheckbox },
        data: () => ({ enabled: false }),
        template:
          '<material-checkbox v-model="enabled" aria-label="Enable feature" @native-change="nativeChange" @input="input" />',
        methods: { nativeChange, input },
      },
      { attachTo: document.body },
    );
    await activate(wrapper.element);
    expect(wrapper.vm.enabled).toBe(true);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(nativeChange.mock.calls[0][0].target).toBe(wrapper.element);
    // jsdom's checkbox click does not compose its input event through a shadow
    // root. Supply the browser's composed event shape to test listener forwarding.
    wrapper.element.shadowRoot
      .querySelector('input')
      .dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    expect(input).toHaveBeenCalledTimes(1);
    expect(input.mock.calls[0][0]).toBeInstanceOf(Event);
    await activate(wrapper.element);
    expect(wrapper.vm.enabled).toBe(false);
  });

  it('copies Array checkbox models on addition and removal without mutating the supplied collection', async () => {
    const initial = Object.freeze(['a']);
    wrapper = mount(
      {
        components: { MaterialCheckbox },
        data: () => ({ selected: initial }),
        template: '<material-checkbox v-model="selected" value="b" aria-label="Option B" />',
      },
      { attachTo: document.body },
    );
    await activate(wrapper.element);
    expect(wrapper.vm.selected).toEqual(['a', 'b']);
    expect(initial).toEqual(['a']);
    const withB = wrapper.vm.selected;
    await activate(wrapper.element);
    expect(wrapper.vm.selected).toEqual(['a']);
    expect(withB).toEqual(['a', 'b']);
  });

  it('matches primitive numeric values and preserves custom scalar true/false values', async () => {
    wrapper = mount(MaterialCheckbox, {
      attachTo: document.body,
      propsData: { checked: ['1'], value: 1 },
    });
    await settle(wrapper.element);
    expect(wrapper.element.checked).toBe(true);
    await activate(wrapper.element);
    expect(wrapper.emitted('change')).toEqual([[[]]]);
    await wrapper.setProps({ checked: 'off', trueValue: 'on', falseValue: 'off' });
    await activate(wrapper.element);
    expect(wrapper.emitted('change')[1]).toEqual(['on']);
  });

  it('forwards indeterminate and required checkbox state to official input anatomy', async () => {
    wrapper = mount(MaterialCheckbox, {
      attachTo: document.body,
      propsData: { indeterminate: true, required: true },
      attrs: { 'aria-label': 'All rows' },
    });
    await settle(wrapper.element);
    const input = wrapper.element.shadowRoot.querySelector('input');
    expect(input.indeterminate).toBe(true);
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-checked')).toBe('mixed');
    expect(input.getAttribute('aria-label')).toBe('All rows');
    expect(wrapper.vm.checkValidity()).toBe(false);
    await activate(wrapper.element);
    expect(wrapper.element.indeterminate).toBe(false);
  });

  it('keeps radio click and Space selection in the official group', async () => {
    wrapper = mount(
      {
        components: { MaterialRadio },
        data: () => ({ choice: 'a' }),
        template:
          '<form><material-radio v-model="choice" name="format" value="a" aria-label="A" /><material-radio v-model="choice" name="format" value="b" aria-label="B" disabled /><material-radio v-model="choice" name="format" value="c" aria-label="C" /></form>',
      },
      { attachTo: document.body },
    );
    const radios = Array.from(wrapper.element.querySelectorAll('md-radio'));
    await Promise.all(radios.map(settle));
    expect(radios.map((radio) => radio.checked)).toEqual([true, false, false]);
    // The test polyfill inserts hidden name-bearing inputs that the upstream
    // arrow controller also selects. Arrow traversal therefore needs a native
    // browser run; it cannot be certified with this polyfilled DOM.
    radios[2].dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    );
    await Promise.all(radios.map(settle));
    expect(wrapper.vm.choice).toBe('c');
    expect(radios.map((radio) => radio.checked)).toEqual([false, false, true]);
    expect(new FormData(wrapper.element).get('format')).toBe('c');
    await activate(radios[0]);
    expect(wrapper.vm.choice).toBe('a');
    expect(radios[0].getAttribute('aria-label')).toBe('A');
  });

  it('preserves Boolean switch v-model, official switch role and Enter interaction', async () => {
    const nativeChange = jest.fn();
    wrapper = mount(
      {
        components: { MaterialSwitch },
        data: () => ({ enabled: false }),
        template:
          '<material-switch v-model="enabled" aria-label="Notifications" icons @native-change="nativeChange" />',
        methods: { nativeChange },
      },
      { attachTo: document.body },
    );
    await settle(wrapper.element);
    const input = wrapper.element.shadowRoot.querySelector('input');
    expect(input.getAttribute('role')).toBe('switch');
    expect(input.getAttribute('aria-label')).toBe('Notifications');
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );
    await settle(wrapper.element);
    expect(wrapper.vm.enabled).toBe(true);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(wrapper.element.icons).toBe(true);
  });

  it.each([
    ['checkbox', MaterialCheckbox],
    ['radio', MaterialRadio],
    ['switch', MaterialSwitch],
  ])('keeps disabled %s selection unchanged', async (_name, Component) => {
    wrapper = mount(Component, {
      attachTo: document.body,
      propsData: { disabled: true },
      attrs: { 'aria-label': 'Disabled choice' },
    });
    await activate(wrapper.element);
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('submits the selected official control values and omits unchecked controls', async () => {
    wrapper = mount(
      {
        render(h) {
          return h('form', [
            h(MaterialCheckbox, {
              props: { checked: true, value: 'yes' },
              attrs: { name: 'check', 'aria-label': 'Check' },
            }),
            h(MaterialCheckbox, {
              props: { checked: false, value: 'no' },
              attrs: { name: 'unchecked', 'aria-label': 'Unchecked' },
            }),
            h(MaterialSwitch, {
              props: { selected: true, value: 'active' },
              attrs: { name: 'switch', 'aria-label': 'Switch' },
            }),
          ]);
        },
      },
      { attachTo: document.body },
    );
    await Promise.all(
      Array.from(wrapper.element.querySelectorAll('md-checkbox, md-switch'), settle),
    );
    const data = new FormData(wrapper.element);
    expect(data.get('check')).toBe('yes');
    expect(data.get('switch')).toBe('active');
    expect(data.has('unchecked')).toBe(false);
  });

  it('requires every exact supported variant and official selection registration', () => {
    expect(MATERIAL_BUTTON_VARIANTS).toEqual({
      filled: 'md-filled-button',
      outlined: 'md-outlined-button',
      tonal: 'md-filled-tonal-button',
      elevated: 'md-elevated-button',
      text: 'md-text-button',
    });
    const required = [
      'md-filled-button',
      'md-outlined-button',
      'md-filled-tonal-button',
      'md-elevated-button',
      'md-checkbox',
      'md-radio',
      'md-switch',
    ];
    required.forEach((tag) => {
      expect(MATERIAL_WEB_CONSTRUCTORS[tag]).toBeDefined();
      for (const replacement of [undefined, HTMLElement]) {
        expect(() =>
          assertMaterialWebRegistration({
            get: (name) => (name === tag ? replacement : MATERIAL_WEB_CONSTRUCTORS[name]),
          }),
        ).toThrow(`Official Material Web registration missing or replaced: ${tag}`);
      }
      expect(() => assertMaterialWebRegistration()).not.toThrow();
    });
  });

  it.each(['missing', 'constructor', '__proto__'])(
    'rejects unsupported button variant %s instead of silently changing its anatomy',
    (variant) => {
      expect(() => MaterialButton.render.call({ variant }, jest.fn())).toThrow(
        `Unsupported Material button variant: ${variant}`,
      );
    },
  );

  it.each([
    ['md-filled-button', MaterialButton, { variant: 'filled' }],
    ['md-outlined-button', MaterialButton, { variant: 'outlined' }],
    ['md-filled-tonal-button', MaterialButton, { variant: 'tonal' }],
    ['md-elevated-button', MaterialButton, { variant: 'elevated' }],
    ['md-text-button', MaterialButton, { variant: 'text' }],
    ['md-checkbox', MaterialCheckbox, {}],
    ['md-radio', MaterialRadio, {}],
    ['md-switch', MaterialSwitch, {}],
  ])(
    'rejects native replacement or removal of %s, then accepts the restored official element',
    async (tag, Component, propsData) => {
      wrapper = mount(Component, { attachTo: document.body, propsData });
      await settle(wrapper.element);
      const official = wrapper.element;
      const placeholder = document.createElement('button');
      placeholder.className = official.className;
      official.replaceWith(placeholder);
      expect(() => assertMaterialWebElement(placeholder, tag)).toThrow(
        `Missing or replaced official Material Web element: ${tag}`,
      );
      expect(() => assertMaterialWebElement(null, tag)).toThrow(
        `Missing or replaced official Material Web element: ${tag}`,
      );
      placeholder.replaceWith(official);
      expect(() => assertMaterialWebElement(official, tag)).not.toThrow();
    },
  );
});
