import Vue from 'vue';
import { mount } from '@vue/test-utils';
import MaterialIconButton from '~/material_system/components/material_icon_button';
import MaterialTextButton from '~/material_system/components/material_text_button';
import MaterialTextField from '~/material_system/components/material_text_field';
import { MATERIAL_WEB_CONSTRUCTORS } from '~/material_system/components/register';
import ShellA from '~/material_system/surfaces/ShellA/ShellA.vue';
import ShellB from '~/material_system/surfaces/ShellB/ShellB.vue';

const settle = async (element) => {
  await Vue.nextTick();
  await element.updateComplete;
  await Promise.resolve();
};

describe('official Material Web Vue 2 adapters', () => {
  let wrapper;
  beforeEach(() => jest.useRealTimers());
  afterEach(() => {
    wrapper?.destroy();
    document.body.innerHTML = '';
  });

  it('renders the official icon button with ripple, focus ring, accessible name and disabled state', async () => {
    const click = jest.fn();
    wrapper = mount(MaterialIconButton, {
      attachTo: document.body,
      attrs: { 'aria-label': 'Open tools' },
      listeners: { click },
    });
    const element = wrapper.element;
    await settle(element);
    expect(element.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-icon-button']);
    const button = element.shadowRoot.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Open tools');
    expect(element.shadowRoot.querySelector('md-ripple')).not.toBeNull();
    expect(element.shadowRoot.querySelector('md-focus-ring')).not.toBeNull();
    button.click();
    expect(click).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ disabled: true });
    await settle(element);
    expect(button.disabled).toBe(true);
    button.click();
    expect(click).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ disabled: false });
    await settle(element);
    expect(button.disabled).toBe(false);
  });

  it('preserves the brand link href, target, text slot and official anchor anatomy', async () => {
    wrapper = mount(MaterialTextButton, {
      attachTo: document.body,
      propsData: { href: '/dashboard' },
      attrs: { target: '_blank' },
      slots: { default: 'GitLab' },
    });
    await settle(wrapper.element);
    const link = wrapper.element.shadowRoot.querySelector('a');
    expect(link.getAttribute('href')).toBe('/dashboard');
    expect(link.target).toBe('_blank');
    expect(wrapper.element.textContent).toBe('GitLab');
    expect(wrapper.element.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-text-button']);
  });

  it('bridges native input and controlled values while forwarding the native change event once', async () => {
    const change = jest.fn();
    wrapper = mount(MaterialTextField, {
      attachTo: document.body,
      propsData: { value: 'start', type: 'search' },
      attrs: { label: 'Search', name: 'query', 'aria-label': 'Global search' },
      listeners: { change },
    });
    const element = wrapper.element;
    await settle(element);
    const input = element.shadowRoot.querySelector('input');
    expect(input.value).toBe('start');
    expect(input.type).toBe('search');
    expect(input.getAttribute('aria-label')).toBe('Global search');
    input.value = 'issues';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    expect(wrapper.emitted('input')).toEqual([['issues']]);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(change.mock.calls[0][0].target).toBe(element);
    await wrapper.setProps({ value: 'pipelines', readonly: true, disabled: true });
    await settle(element);
    expect(input.value).toBe('pipelines');
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(true);
    expect(element.name).toBe('query');
  });

  it('defers the Vue model update until IME composition finishes', async () => {
    wrapper = mount(MaterialTextField, { attachTo: document.body });
    const element = wrapper.element;
    await settle(element);
    const input = element.shadowRoot.querySelector('input');
    input.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true, composed: true }),
    );
    input.value = '搜尋';
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, isComposing: true }),
    );
    expect(wrapper.emitted('input')).toBeUndefined();
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true }));
    expect(wrapper.emitted('input')).toEqual([['搜尋']]);
  });

  it('delegates form data and submit behavior to the official form-associated elements', async () => {
    const submit = jest.fn((event) => event.preventDefault());
    wrapper = mount(
      {
        components: { MaterialTextField, MaterialTextButton },
        render(h) {
          return h('form', { on: { submit } }, [
            h(MaterialTextField, {
              attrs: { name: 'query', label: 'Query' },
              props: { value: 'issues' },
            }),
            h(MaterialTextButton, { props: { type: 'submit' } }, ['Search']),
          ]);
        },
      },
      { attachTo: document.body },
    );
    const field = wrapper.element.querySelector('md-filled-text-field');
    const button = wrapper.element.querySelector('md-text-button');
    await settle(field);
    await settle(button);
    expect(field.form).toBe(wrapper.element);
    expect(new FormData(wrapper.element).get('query')).toBe('issues');
    button.shadowRoot.querySelector('button').click();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].submitter).toBe(button);
    field.value = 'edited';
    expect(new FormData(wrapper.element).get('query')).toBe('edited');
  });

  it.each([
    ['Shell A', ShellA],
    ['Shell B', ShellB],
  ])('retains %s search keyboard events, focus and palette controls', async (_name, Shell) => {
    wrapper = mount(Shell, { attachTo: document.body, propsData: { chromeOnly: true } });
    const field = wrapper.element.querySelector('md-filled-text-field');
    await settle(field);
    const input = field.shadowRoot.querySelector('input');
    input.value = 'issues';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await Vue.nextTick();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, composed: true }),
    );
    expect(wrapper.emitted('search')[0][0]).toBe('issues');
    wrapper.vm.focusSearch();
    expect(field.shadowRoot.activeElement).toBe(input);
    const palette = wrapper.element.querySelector('.material-shell__palette');
    await settle(palette);
    palette.shadowRoot.querySelector('button').click();
    expect(wrapper.vm.paletteOpen).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.vm.paletteOpen).toBe(false);
  });

  it('keeps a non-submit action inside a form from submitting and honors click cancellation', async () => {
    const submit = jest.fn((event) => event.preventDefault());
    const cancel = jest.fn((event) => event.preventDefault());
    wrapper = mount(
      {
        render(h) {
          return h('form', { on: { submit } }, [
            h(MaterialIconButton, { attrs: { 'aria-label': 'Tools' } }),
            h(MaterialTextButton, { props: { type: 'submit' }, on: { click: cancel } }, ['Save']),
          ]);
        },
      },
      { attachTo: document.body },
    );
    const buttons = wrapper.element.querySelectorAll('md-icon-button, md-text-button');
    await Promise.all(Array.from(buttons, settle));
    buttons.forEach((button) => button.shadowRoot.querySelector('button').click());
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps managed theme authority and forwards the regex and sidebar actions', async () => {
    wrapper = mount(ShellA, {
      attachTo: document.body,
      propsData: { managedTheme: true, initialTheme: 'dark' },
      stubs: { MaterialSidebar: true },
    });
    for (const selector of [
      '.material-shell__theme',
      '.material-shell__regex',
      '.material-shell__menu',
    ]) {
      const element = wrapper.element.querySelector(selector);
      await settle(element);
      element.shadowRoot.querySelector('button').click();
    }
    expect(wrapper.emitted('theme-change')).toEqual([['light']]);
    expect(wrapper.attributes('data-theme')).toBe('dark');
    expect(wrapper.vm.regexOpen).toBe(true);
    expect(wrapper.emitted('toggle-sidebar')).toHaveLength(1);
    await wrapper.setProps({ initialTheme: 'light' });
    expect(wrapper.attributes('data-theme')).toBe('light');
  });
});
