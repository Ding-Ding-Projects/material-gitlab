import Vue from 'vue';
import fs from 'fs';
import path from 'path';
import { mount } from '@vue/test-utils';
import { parseComponent, compile } from 'vue-template-compiler';
import { parse } from '@babel/parser';
import { MATERIAL_WEB_CONSTRUCTORS } from '~/material_system/components/register';
import PipelineTopBar from '~/material_system/surfaces/Pipelines/components/TopBar.vue';
import PipelineConfirm from '~/material_system/surfaces/Pipelines/components/ConfirmDialog.vue';
import PipelinePalette from '~/material_system/surfaces/Pipelines/components/CommandPalette.vue';
import PipelineRow from '~/material_system/surfaces/Pipelines/components/PipelineRow.vue';
import JobCard from '~/material_system/surfaces/Pipelines/components/JobCard.vue';
import BuildEditor from '~/material_system/surfaces/Build/components/PipelineEditor.vue';
import CodeRegex from '~/material_system/surfaces/Code/components/RegexBuilderPopover.vue';
import RepositoryRegex from '~/material_system/surfaces/Repository/components/RegexBuilderDialog.vue';
import DeployConfirm from '~/material_system/surfaces/Deploy/components/ConfirmDialog.vue';
import SecureList from '~/material_system/surfaces/Secure/components/SecureListPanel.vue';
import BuildSearch from '~/material_system/surfaces/Build/components/SearchField.vue';
import CodeTopBar from '~/material_system/surfaces/Code/components/CodeTopBar.vue';
import DeployTopBar from '~/material_system/surfaces/Deploy/components/DeployTopBar.vue';
import RepositoryTopBar from '~/material_system/surfaces/Repository/components/RepositoryTopBar.vue';
import SecureTopBar from '~/material_system/surfaces/Secure/components/SecureTopBar.vue';
import SecurityTopBar from '~/material_system/surfaces/Security/components/TopBar.vue';

const base = path.resolve(__dirname, '../../../app/assets/javascripts/material_system/surfaces');
const surfaces = ['Analyze', 'Build', 'Code', 'Deploy', 'Monitor', 'Operate', 'Pipelines', 'Repository', 'Secure', 'Security'];
const controls = {
  'material-button': 'buttons', 'material-text-field': 'textFields',
  'material-checkbox': 'checkboxes', 'material-icon-button': 'iconButtons',
  'material-text-button': 'textButtons', 'material-radio': 'radios', 'material-switch': 'switches',
};
const nodes = (ast) => {
  const seen = new Set();
  const visit = (node) => {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (node.tag) node.tag = node.tag.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    (node.children || []).forEach(visit);
    (node.ifConditions || []).forEach(({ block }) => visit(block));
    Object.values(node.scopedSlots || {}).forEach(visit);
  };
  visit(ast);
  return Array.from(seen).filter(({ tag }) => tag);
};
const official = (element, tag) => {
  expect(element.tagName.toLowerCase()).toBe(tag);
  expect(element.constructor).toBe(MATERIAL_WEB_CONSTRUCTORS[tag]);
  expect(element.shadowRoot).not.toBeNull();
};
const settle = async (wrapper) => {
  await Vue.nextTick();
  await Promise.all([wrapper.element, ...wrapper.element.querySelectorAll('*')].map((el) => el.updateComplete));
  await Vue.nextTick();
};
const allVueFiles = (directory, relative = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
  ? allVueFiles(path.join(directory, entry.name), `${relative}${entry.name}/`)
  : entry.name.endsWith('.vue') ? [`${relative}${entry.name}`] : []);

describe('complete operations supported-control migration', () => {
  let wrapper;
  beforeEach(() => {
    jest.useRealTimers();
    const matches = Element.prototype.matches;
    jest.spyOn(Element.prototype, 'matches').mockImplementation(function match(selector) {
      return matches.call(this, selector === ':focus-visible' ? ':focus' : selector);
    });
  });
  afterEach(() => { wrapper?.destroy(); document.body.innerHTML = ''; });

  it.each(surfaces)('%s matches its explicit inventory and leaves no supported native control', (surface) => {
    const directory = path.join(base, surface);
    const inventory = JSON.parse(fs.readFileSync(path.join(directory, 'control-inventory.json'), 'utf8'));
    expect(inventory.surface).toBe(surface);
    expect(inventory.files.length).toBeGreaterThan(0);
    expect(new Set(inventory.files.map(({ file }) => file)).size).toBe(inventory.files.length);
    const controlFiles = [];
    allVueFiles(directory).forEach((file) => {
      const component = parseComponent(fs.readFileSync(path.join(directory, file), 'utf8'));
      const result = compile(component.template.content);
      expect(result.errors).toEqual([]);
      const elements = nodes(result.ast);
      const script = parse(component.script.content, { sourceType: 'module' });
      const declaration = script.program.body.find((item) => item.type === 'ExportDefaultDeclaration').declaration;
      const registrations = declaration.properties.find((item) => item.key?.name === 'components')?.value.properties || [];
      const registrationNames = registrations.map((item) => item.key.name || item.key.value);
      const imports = script.program.body.filter((item) => item.type === 'ImportDeclaration');
      Object.keys(controls).filter((tag) => elements.some((node) => node.tag === tag)).forEach((tag) => {
        const name = tag.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');
        expect(registrationNames).toContain(name);
        expect(imports.some((item) => item.source.value.endsWith(`/components/${tag.replace(/-/g, '_')}`) && item.specifiers.some((specifier) => specifier.local.name === name))).toBe(true);
      });
      if (elements.some(({ tag }) => controls[tag] || ['input', 'button', 'textarea', 'select'].includes(tag))) controlFiles.push(file);
      const row = inventory.files.find((item) => item.file === file);
      if (!row) return;
      Object.entries(controls).forEach(([tag, count]) => {
        expect(elements.filter((node) => node.tag === tag).length).toBe(row[count] || 0);
      });
      const native = elements.filter(({ tag }) => ['input', 'button', 'textarea', 'select'].includes(tag));
      expect(native.length).toBe((row.nativeControls || []).length);
      native.forEach((node, index) => {
        const exception = row.nativeControls[index];
        expect(exception.tag).toBe(node.tag);
        expect(exception.type).toBe(node.attrsMap.type || '');
        expect(exception.reason.length).toBeGreaterThan(20);
        expect(node.tag === 'select' || (node.tag === 'input' && ['hidden', 'file', 'radio'].includes(node.attrsMap.type))).toBe(true);
      });
    });
    expect(controlFiles.sort()).toEqual(inventory.files.filter((row) => Object.values(controls).some((key) => row[key]) || row.nativeControls?.length).map(({ file }) => file).sort());
    inventory.files.forEach(({ file }) => expect(fs.existsSync(path.join(directory, file))).toBe(true));
  });

  it.each([
    ['Build', BuildSearch, { label: 'Search builds' }], ['Code', CodeTopBar, { searchPlaceholder: 'Search code' }], ['Deploy', DeployTopBar, {}],
    ['Pipelines', PipelineTopBar, {}], ['Repository', RepositoryTopBar, { search: '', regexMode: false, regexOpen: false, paletteOpen: false, dark: false }],
    ['Secure', SecureTopBar, { tabLabel: 'Vulnerabilities' }], ['Security', SecurityTopBar, {}],
  ])('%s uses official text and action constructors and rejects native replacements', async (_surface, component, propsData) => {
    wrapper = mount(component, { propsData, attachTo: document.body });
    await settle(wrapper);
    const elements = Array.from(wrapper.element.querySelectorAll('md-filled-text-field, md-text-button, md-filled-button, md-icon-button'));
    expect(elements.length).toBeGreaterThan(0);
    expect(elements.some((element) => element.localName === 'md-filled-text-field')).toBe(true);
    elements.forEach((element) => {
      const tag = element.localName;
      official(element, tag);
      if (tag === 'md-filled-text-field') expect(element.shadowRoot.querySelector('input, textarea').getAttribute('aria-label')).toBeTruthy();
      const replacement = document.createElement(tag === 'md-filled-text-field' ? 'input' : 'button');
      element.replaceWith(replacement);
      expect(() => official(replacement, tag)).toThrow();
      replacement.replaceWith(element);
      official(element, tag);
    });
  });

  it('emits pipeline search scalar values and retains regex state', async () => {
    wrapper = mount(PipelineTopBar, { propsData: { search: 'before', regexMode: true }, attachTo: document.body });
    await settle(wrapper);
    const field = wrapper.find('#mgl-pl-search-input').element;
    field.value = 'after';
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(wrapper.emitted('update:search')).toEqual([['after']]);
    expect(wrapper.find('.mgl-pl-chip-btn').element.ariaPressed).toBe('true');
  });

  it('keeps confirmation and cancellation separate without leaking through the scrim', async () => {
    wrapper = mount(PipelineConfirm, { propsData: { title: 'Delete pipeline?', message: 'This deletes the selected pipeline.' }, attachTo: document.body });
    await settle(wrapper);
    expect(wrapper.emitted('confirm')).toBeUndefined();
    wrapper.find('md-filled-button').element.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('confirm')).toEqual([[]]);
    expect(wrapper.emitted('cancel')).toBeUndefined();
    wrapper.find('md-text-button').element.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('cancel')).toEqual([[]]);
  });

  it('cycles palette focus across official hosts and invokes only the selected action', async () => {
    const first = jest.fn(); const second = jest.fn();
    wrapper = mount(PipelinePalette, { propsData: { actions: [{ label: 'Retry', run: first }, { label: 'Delete', run: second }] }, attachTo: document.body });
    await settle(wrapper);
    wrapper.vm.moveFocus(1);
    const actions = wrapper.findAll('md-text-button');
    expect(document.activeElement).toBe(actions.at(0).element);
    wrapper.vm.moveFocus(1);
    expect(document.activeElement).toBe(actions.at(1).element);
    actions.at(1).element.shadowRoot.querySelector('button').click();
    expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('close')).toEqual([[]]);
  });

  it('keeps row metadata outside the action and selection independent of opening', async () => {
    wrapper = mount(PipelineRow, { propsData: { pipeline: { id: 8, title: 'Release', status: 'success', stages: [], duration: '2 min', sha: 'a12', branch: 'main', origin: 'web' } }, attachTo: document.body });
    await settle(wrapper);
    expect(wrapper.find('md-text-button').text()).toBe('Release');
    expect(wrapper.find('.mgl-pl-row-duration').element.closest('md-text-button')).toBeNull();
    wrapper.find('md-checkbox').element.shadowRoot.querySelector('input').click();
    expect(wrapper.emitted('toggle-select')).toEqual([[8]]);
    expect(wrapper.emitted('open')).toBeUndefined();
    wrapper.find('md-text-button').element.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('open')).toEqual([[8]]);
  });

  it('keeps job metadata outside the job action', async () => {
    wrapper = mount(JobCard, { propsData: { job: { name: 'Compile', status: 'success', duration: '2 min' }, active: true }, attachTo: document.body });
    await settle(wrapper);
    expect(wrapper.find('md-text-button').text()).toBe('Compile');
    expect(wrapper.find('.mgl-pl-job-duration').element.closest('md-text-button')).toBeNull();
    wrapper.find('md-text-button').element.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('pick')).toEqual([[]]);
  });
  it('keeps Build YAML multiline values and prevents invalid or busy commits', async () => {
    wrapper = mount(BuildEditor, { propsData: { yaml: '', busy: true }, attachTo: document.body });
    await settle(wrapper);
    const field = wrapper.find('md-filled-text-field').element;
    official(field, 'md-filled-text-field');
    expect(field.type).toBe('textarea');
    expect(field.shadowRoot.querySelector('textarea')).not.toBeNull();
    field.value = 'stages:\n  - build';
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(wrapper.emitted('update:yaml')).toEqual([['stages:\n  - build']]);
    const action = wrapper.find('md-filled-button').element;
    expect(action.disabled).toBe(true);
    action.shadowRoot.querySelector('button').click();
    expect(wrapper.emitted('commit')).toBeUndefined();
  });

  it.each([['Code', CodeRegex], ['Repository', RepositoryRegex]])('%s regex sample stays multiline and receives scalar edits', async (_surface, component) => {
    wrapper = mount(component, { attachTo: document.body });
    await settle(wrapper);
    const field = wrapper.findAll('md-filled-text-field').wrappers.map((item) => item.element).find((element) => element.type === 'textarea');
    expect(field).toBeDefined();
    expect(field.shadowRoot.querySelector('textarea')).not.toBeNull();
    field.value = 'first\nsecond';
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settle(wrapper);
    expect(wrapper.vm.testText).toBe('first\nsecond');
  });

  it('wraps Deploy confirmation focus between official hosts', async () => {
    wrapper = mount(DeployConfirm, { propsData: { title: 'Delete release?', message: 'Confirm deletion.' }, attachTo: document.body });
    await settle(wrapper);
    const cancel = wrapper.find('md-text-button').element;
    const confirm = wrapper.find('md-filled-button').element;
    cancel.focus();
    const backwards = { shiftKey: true, preventDefault: jest.fn() };
    wrapper.vm.keepFocus(backwards);
    expect(backwards.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(confirm);
    const forwards = { shiftKey: false, preventDefault: jest.fn() };
    wrapper.vm.keepFocus(forwards);
    expect(forwards.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(cancel);
  });

  it('keeps Secure bulk selection indeterminate without mutating a child prop', async () => {
    wrapper = mount(SecureList, {
      attachTo: document.body,
      propsData: { activeTabId: 'vulnerabilities', tabLabel: 'Vulnerabilities', rows: [{ id: 'one', title: 'First', actions: [] }, { id: 'two', title: 'Second', actions: [] }], selectedIds: ['one'] },
      stubs: { SecureListRow: true },
    });
    await settle(wrapper);
    const checkbox = wrapper.find('md-checkbox').element;
    official(checkbox, 'md-checkbox');
    expect(checkbox.indeterminate).toBe(true);
    await wrapper.setProps({ selectedIds: ['one', 'two'] });
    await settle(wrapper);
    expect(checkbox.indeterminate).toBe(false);
    expect(checkbox.checked).toBe(true);
  });

});
