import Vue from 'vue';
import fs from 'fs';
import path from 'path';
import { mount } from '@vue/test-utils';
import { parseComponent, compile } from 'vue-template-compiler';
import { MATERIAL_WEB_CONSTRUCTORS } from '~/material_system/components/register';
import ListRow from '~/material_system/surfaces/Admin/components/ListRow.vue';
import LabelsList from '~/material_system/surfaces/Manage/components/LabelsList.vue';
import TodoListItem from '~/material_system/surfaces/Todos/components/TodoListItem.vue';

const root = path.resolve(__dirname, '../../../app/assets/javascripts/material_system/surfaces');
const inventory = [
  ['Admin', 'components/ListRow.vue', ['material-checkbox', 'material-button']],
  ['Admin', 'components/SearchField.vue', ['material-text-field', 'material-button']],
  ['Manage', 'components/MgSelectionToolbar.vue', ['material-checkbox', 'material-button']],
  ['Manage', 'components/LabelsList.vue', ['material-checkbox', 'material-button']],
  ['Todos', 'components/TodoListItem.vue', ['material-checkbox', 'material-button']],
  ['Todos', 'components/TodosTopBar.vue', ['material-text-field', 'material-button']],
  ['Todos', 'components/TodosSelectionBar.vue', ['material-checkbox', 'material-button']],
  ['Manage', 'components/ActivityFeed.vue', ['material-checkbox', 'material-button']],
  ['Manage', 'components/CommandPalette.vue', ['material-text-field']],
  ['Manage', 'components/ManagePageHeader.vue', ['material-button']],
  ['Manage', 'components/ManageTopBar.vue', ['material-text-field', 'material-button']],
  ['Manage', 'components/NotificationHost.vue', ['material-button']],
  ['Manage', 'components/RegexBuilderPopover.vue', ['material-text-field', 'material-checkbox', 'material-button']],
  ['Todos', 'Todos.vue', ['material-button']],
  ['Todos', 'components/CommandPalette.vue', ['material-text-field']],
  ['Todos', 'components/RegexBuilderPopover.vue', ['material-text-field', 'material-button']],
  ['Todos', 'components/TodoList.vue', ['material-button']],
  ['Todos', 'components/TodosSidebar.vue', ['material-text-field', 'material-button']],
];

const settle = async (element) => {
  await Vue.nextTick();
  await element.updateComplete;
  await Vue.nextTick();
};

describe('general control Material Web migration', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('keeps an exact hand-written adapter inventory and rejects native replacements', () => {
    inventory.forEach(([surface, file, adapters]) => {
      const source = fs.readFileSync(path.join(root, surface, file), 'utf8');
      expect(compile(parseComponent(source).template.content).errors).toEqual([]);
      adapters.forEach((adapter) => expect(source).toContain(`<${adapter}`));
      expect(source).not.toMatch(/<input\\b[^>]*type="checkbox"/);
    });
  });

  it('keeps an Admin row selector and action on official constructors', async () => {
    const wrapper = mount(ListRow, { attachTo: document.body, propsData: { row: { title: 'Runner', icon: 'runner', tone: 'primary', actionLabel: 'Pause', actionId: 'pause' } } });
    const checkbox = wrapper.element.querySelector('md-checkbox');
    const action = wrapper.element.querySelector('md-filled-button');
    await settle(checkbox); await settle(action);
    expect(checkbox.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-checkbox']);
    expect(action.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-filled-button']);
    checkbox.shadowRoot.querySelector('input').click();
    expect(wrapper.emitted('toggle-select')).toHaveLength(1);
    const replacement = document.createElement('input');
    checkbox.replaceWith(replacement);
    expect(replacement.constructor).not.toBe(MATERIAL_WEB_CONSTRUCTORS['md-checkbox']);
  });

  it('keeps Manage label selections and deletion payloads', async () => {
    const wrapper = mount(LabelsList, { attachTo: document.body, propsData: { labels: [{ id: 'label-1', name: 'Backend', color: '#111111', textColor: '#ffffff', description: 'API', openIssuesCount: 2 }] } });
    const checkbox = wrapper.element.querySelector('.mg-label-row md-checkbox');
    await settle(checkbox);
    expect(checkbox.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-checkbox']);
    checkbox.shadowRoot.querySelector('input').click();
    await settle(checkbox);
    expect(wrapper.emitted('toggle-select')).toEqual([['label-1']]);
    wrapper.element.querySelector('.mg-label-row md-filled-button').shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('request-delete')).toEqual([[{ mode: 'single', ids: ['label-1'] }]]);
  });

  it('keeps Todos selection and completion identities', async () => {
    const todo = { id: 'todo-1', actor: 'Jordan', action: 'reviewed', icon: 'done', target: { href: '/group/project', label: 'Project' }, project: 'Project', when: 'now', state: 'pending' };
    const wrapper = mount(TodoListItem, { attachTo: document.body, propsData: { todo } });
    const checkbox = wrapper.element.querySelector('md-checkbox');
    await settle(checkbox);
    expect(checkbox.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS['md-checkbox']);
    checkbox.shadowRoot.querySelector('input').click();
    expect(wrapper.emitted('toggle-select')).toEqual([['todo-1']]);
    wrapper.element.querySelector('md-filled-button').shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('mark-done')).toEqual([['todo-1']]);
  });
});
