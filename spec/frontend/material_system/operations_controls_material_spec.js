import { mount } from '@vue/test-utils';
import FileTreeRow from '~/material_system/surfaces/Repository/components/FileTreeRow.vue';
import SelectionBar from '~/material_system/surfaces/Deploy/components/SelectionBar.vue';
import MaterialButton from '~/material_system/components/material_button';
import { MATERIAL_WEB_CONSTRUCTORS } from '~/material_system/components/register';

const settle = async (element) => {
  await Promise.resolve();
  await element.updateComplete;
  await Promise.resolve();
};

describe('migrated operations controls use official DOM constructors', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the official checkbox constructor and emits the exact file identity', async () => {
    const wrapper = mount(FileTreeRow, {
      attachTo: document.body,
      propsData: { entry: { name: 'Gemfile.lock', kind: 'file', message: 'Pin versions', when: 'now' } },
    });
    const checkbox = wrapper.element.querySelector('md-checkbox');
    await settle(checkbox);
    expect(checkbox.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-checkbox']);
    checkbox.shadowRoot.querySelector('input').click();
    await settle(checkbox);
    expect(wrapper.emitted('toggle-select')).toEqual([['Gemfile.lock']]);
  });

  it('keeps an official bulk checkbox indeterminate and emits clear for a fully selected list', async () => {
    const wrapper = mount(SelectionBar, {
      attachTo: document.body,
      propsData: { selectedCount: 2, totalCount: 3, itemLabelPlural: 'releases' },
    });
    const checkbox = wrapper.element.querySelector('md-checkbox');
    await settle(checkbox);
    expect(checkbox.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-checkbox']);
    expect(checkbox.indeterminate).toBe(true);
    await wrapper.setProps({ selectedCount: 3 });
    await settle(checkbox);
    checkbox.shadowRoot.querySelector('input').click();
    await settle(checkbox);
    expect(wrapper.emitted('clear')).toEqual([[]]);
  });

  it('uses a real official disabled action constructor and suppresses its click', async () => {
    const click = jest.fn();
    const wrapper = mount(MaterialButton, {
      attachTo: document.body,
      propsData: { disabled: true, variant: 'text' },
      listeners: { click },
      slots: { default: 'Delete' },
    });
    await settle(wrapper.element);
    expect(wrapper.element.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-text-button']);
    wrapper.element.shadowRoot.querySelector('button').click();
    expect(click).not.toHaveBeenCalled();
  });
});
