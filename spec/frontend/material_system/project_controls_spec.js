import Vue from 'vue';
import fs from 'fs';
import path from 'path';
import { mount } from '@vue/test-utils';
import { parseComponent, compile } from 'vue-template-compiler';
import { MATERIAL_WEB_CONSTRUCTORS } from '~/material_system/components/register';
import PlanTopBar from '~/material_system/surfaces/Plan/components/TopBar.vue';
import PlanConfirm from '~/material_system/surfaces/Plan/components/ConfirmDialog.vue';
import IssueDialog from '~/material_system/surfaces/Issues/components/NewIssueDialog.vue';
import IssueHeader from '~/material_system/surfaces/Issues/components/SurfaceHeader.vue';
import MrComposer from '~/material_system/surfaces/MergeRequests/components/MrCommentComposer.vue';
import MrHeader from '~/material_system/surfaces/MergeRequests/components/MrListHeader.vue';
import EpicsToolbar from '~/material_system/surfaces/Epics/components/EpicsToolbar.vue';
import ProjectDetails from '~/material_system/surfaces/Settings/components/ProjectDetailsCard.vue';

const base = path.resolve(__dirname, '../../../app/assets/javascripts/material_system/surfaces');
const surfaces = ['Settings', 'Plan', 'Issues', 'MergeRequests', 'Epics'];
const settle = async (wrapper) => {
  await Vue.nextTick();
  await Promise.all(Array.from(wrapper.element.querySelectorAll('*')).map((el) => el.updateComplete));
  await Vue.nextTick();
};
const official = (element, tag) => {
  expect(element.tagName.toLowerCase()).toBe(tag);
  expect(element.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS[tag]);
  expect(element.shadowRoot).not.toBeNull();
};
const countTags = (ast) => {
  const visited = new Set();
  const counts = {};
  const visit = (node) => {
    if (!node || visited.has(node)) return;
    visited.add(node);
    if (node.tag) counts[node.tag] = (counts[node.tag] || 0) + 1;
    (node.children || []).forEach(visit);
    (node.ifConditions || []).forEach(({ block }) => visit(block));
    Object.values(node.scopedSlots || {}).forEach(visit);
  };
  visit(ast);
  return counts;
};
const cases = [
  ['Plan', PlanTopBar, { tabLabel: 'Milestones' }, '.gl-mds-plan__search-input'],
  ['Issues', IssueDialog, { titleValue: 'Existing title' }, '#gl-mds-new-issue-title-input'],
  ['MergeRequests', MrComposer, { value: 'Existing comment' }, '#mr-comment-input'],
  ['Epics', EpicsToolbar, { search: 'Existing search' }, '#epics-search-input'],
  ['Settings', ProjectDetails, { projectName: 'Existing project', visibility: 'Private' }, '.st-field__input'],
];

describe('project surface official control migration', () => {
  let wrapper;
  beforeEach(() => {
    jest.useRealTimers();
    // jsdom has focus state but no :focus-visible parser. This shim supports
    // DOM focus traversal only and makes no visual focus-ring claim.
    const matches = Element.prototype.matches;
    jest.spyOn(Element.prototype, 'matches').mockImplementation(function match(selector) {
      return matches.call(this, selector === ':focus-visible' ? ':focus' : selector);
    });
  });
  afterEach(() => { wrapper?.destroy(); document.body.innerHTML = ''; });

  it.each(surfaces)('%s has a fixed explicit control inventory and compilable owned templates', (surface) => {
    const inventory = JSON.parse(fs.readFileSync(path.join(base, surface, 'control-inventory.json'), 'utf8'));
    expect(inventory.surface).toBe(surface);
    expect(inventory.files.length).toBeGreaterThan(0);
    inventory.files.forEach(({ file, buttons, textFields, checkboxes, iconButtons, textButtons }) => {
      const source = fs.readFileSync(path.join(base, surface, file), 'utf8');
      const template = parseComponent(source).template.content;
      const result = compile(template);
      expect(result.errors).toEqual([]);
      const tags = countTags(result.ast);
      expect((tags['material-button'] || 0) + (tags.MaterialButton || 0)).toBe(buttons);
      expect((tags['material-text-field'] || 0) + (tags.MaterialTextField || 0)).toBe(textFields);
      expect((tags['material-checkbox'] || 0) + (tags.MaterialCheckbox || 0)).toBe(checkboxes);
      expect((tags['material-icon-button'] || 0) + (tags.MaterialIconButton || 0)).toBe(iconButtons);
      expect((tags['material-text-button'] || 0) + (tags.MaterialTextButton || 0)).toBe(textButtons);
      expect(template).not.toMatch(/<button\b/);
      expect(template).not.toMatch(/<input\b[^>]*type="(?:text|search|email|password|number|url)"/);
    });
  });

  it.each(cases)('%s renders an official text field and rejects a native replacement', async (_surface, component, propsData, selector) => {
    wrapper = mount(component, { propsData, attachTo: document.body });
    await settle(wrapper);
    const element = wrapper.find(selector).element;
    official(element, 'md-filled-text-field');
    expect(element.shadowRoot.querySelector('input, textarea').getAttribute('aria-label')).toBeTruthy();
    const replacement = document.createElement('input');
    element.replaceWith(replacement);
    expect(() => official(replacement, 'md-filled-text-field')).toThrow();
    replacement.replaceWith(element);
    official(element, 'md-filled-text-field');
  });

  it.each(cases)('%s renders official action constructors and detects replacement', async (_surface, component, propsData) => {
    wrapper = mount(component, { propsData, attachTo: document.body });
    await settle(wrapper);
    const actions = wrapper.findAllComponents({ name: 'MaterialButton' });
    expect(actions.length).toBeGreaterThan(0);
    actions.wrappers.forEach((action) => {
      const element = action.element;
      const tag = element.tagName.toLowerCase();
      official(element, tag);
      const replacement = document.createElement('button');
      element.replaceWith(replacement);
      expect(() => official(replacement, tag)).toThrow();
      replacement.replaceWith(element);
      official(element, tag);
    });
  });

  it('keeps issue title/body values, submission conditions and keyboard events', async () => {
    wrapper = mount(IssueDialog, { attachTo: document.body });
    await settle(wrapper);
    const field = wrapper.find('#gl-mds-new-issue-title-input').element;
    field.value = 'Real title';
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(wrapper.emitted('update:title')).toEqual([['Real title']]);
    const create = wrapper.find('.gl-mds-dialog__confirm').element;
    expect(create.disabled).toBe(true);
    create.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('create')).toBeUndefined();
    await wrapper.setProps({ titleValue: 'Real title' });
    await settle(wrapper);
    create.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('create')).toHaveLength(1);
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, composed: true }));
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('keeps comment value emission and empty-comment disabled behavior', async () => {
    wrapper = mount(MrComposer, { propsData: { value: '' }, attachTo: document.body });
    await settle(wrapper);
    const field = wrapper.find('#mr-comment-input').element;
    field.value = 'Review text';
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(wrapper.emitted('input')).toEqual([['Review text']]);
    expect(wrapper.find('.mr-comment-composer__submit').element.disabled).toBe(true);
    await wrapper.setProps({ value: 'Review text' });
    await settle(wrapper);
    wrapper.find('.mr-comment-composer__submit').element.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('submit')).toBeDefined();
  });

  it('preserves authorized route links and omits unauthorized create actions', async () => {
    wrapper = mount(IssueHeader, { propsData: { view: 'list', canCreate: true, newIssuePath: '/project/-/issues/new', boardPath: '/project/-/boards' }, attachTo: document.body });
    await settle(wrapper);
    expect(wrapper.findAllComponents({ name: 'MaterialButton' }).wrappers.map((w) => w.element.href)).toContain('/project/-/issues/new');
    await wrapper.setProps({ canCreate: false });
    expect(wrapper.text()).not.toContain('New issue');
    wrapper.destroy();
    wrapper = mount(MrHeader, { propsData: { count: 2, canCreate: false, newPath: '/project/-/merge_requests/new' } });
    expect(wrapper.text()).not.toContain('New merge request');
  });

  it('keeps Settings permission-disabled visibility choices and blur persistence', async () => {
    wrapper = mount(ProjectDetails, { propsData: { projectName: 'Original', visibility: 'Private', canChangeVisibility: false }, attachTo: document.body });
    await settle(wrapper);
    wrapper.findAllComponents({ name: 'MaterialButton' }).wrappers.forEach((action) => {
      expect(action.element.disabled).toBe(true);
      action.element.shadowRoot.querySelector('button').click();
    });
    expect(wrapper.emitted('update:visibility')).toBeUndefined();
    const field = wrapper.find('.st-field__input').element;
    field.value = 'Updated';
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('blur'));
    expect(wrapper.emitted('update:project-name')).toEqual([['Updated']]);
  });

  it('preserves confirm focus and wraps keyboard traversal across Material hosts', async () => {
    wrapper = mount(PlanConfirm, { propsData: { title: 'Confirm', message: 'Proceed?', confirmLabel: 'Continue' }, attachTo: document.body });
    await settle(wrapper);
    const cancel = wrapper.find('.gl-mds-confirm__cancel').element;
    const confirm = wrapper.find('.gl-mds-confirm__confirm').element;
    cancel.focus();
    expect(document.activeElement).toBe(cancel);
    cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, shiftKey: true, bubbles: true, composed: true, cancelable: true }));
    expect(document.activeElement).toBe(confirm);
  });
});
