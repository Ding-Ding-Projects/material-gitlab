import { mount } from '@vue/test-utils';
import ProjectPermissionsCard from '~/material_system/surfaces/Settings/components/ProjectPermissionsCard.vue';

jest.mock('~/lib/utils/csrf', () => ({ token: 'permissions-csrf' }));
jest.mock('@gitlab/ui', () => ({
  GlForm: { render(h) { return h('form', { attrs: this.$attrs, on: this.$listeners }, this.$slots.default); } },
  GlButton: { render(h) { return h('button', { attrs: this.$attrs, on: this.$listeners }, this.$slots.default); } },
  GlFormGroup: { render(h) { return h('div', this.$slots.default); } },
  GlFormSelect: { props: ['value', 'options', 'disabled'], render(h) { return h('select', { attrs: { disabled: this.disabled }, on: { change: (event) => this.$emit('input', Number(event.target.value)) } }, this.options.map((option) => h('option', { domProps: { value: option.value, selected: option.value === this.value }, attrs: { disabled: option.disabled } }, option.text))); } },
  GlFormCheckbox: { props: ['checked', 'disabled'], render(h) { return h('input', { attrs: { type: 'checkbox', disabled: this.disabled }, domProps: { checked: this.checked }, on: { change: (event) => this.$emit('change', event.target.checked) } }); } },
  GlLink: { render(h) { return h('a', { attrs: this.$attrs }, this.$slots.default); } },
}));

const field = (key, name, value, extras = {}) => ({ key, label: key, name: `project[project_feature_attributes][${name}]`, value, kind: 'access', ...extras });
const metadata = () => ({ allowed: true, action: '/group/project', visibilityLevel: 20, fields: [field('repositoryAccessLevel', 'repository_access_level', 20), field('mergeRequestsAccessLevel', 'merge_requests_access_level', 20, { repositoryDependent: true }), field('buildsAccessLevel', 'builds_access_level', 20, { repositoryDependent: true }), field('pagesAccessLevel', 'pages_access_level', 10), { key: 'emailsEnabled', name: 'project[project_setting_attributes][emails_enabled]', kind: 'boolean', value: true, label: 'Email notifications' }, { key: 'showDiffPreviewInEmail', name: 'project[project_setting_attributes][show_diff_preview_in_email]', kind: 'boolean', value: true, label: 'Diff preview' }] });

describe('design-owned project feature permissions', () => {
  let wrapper;
  afterEach(() => wrapper?.destroy());

  it('renders exact existing native nested field payloads with CSRF', () => {
    wrapper = mount(ProjectPermissionsCard, { propsData: { metadata: metadata() } });
    expect(wrapper.find('form').attributes()).toMatchObject({ action: '/group/project', method: 'post' });
    expect(wrapper.find('input[name="authenticity_token"]').element.value).toBe('permissions-csrf');
    expect(wrapper.find('input[name="_method"]').element.value).toBe('patch');
    expect(wrapper.find('input[name="project[project_feature_attributes][repository_access_level]"]').element.value).toBe('20');
  });

  it('constrains dependent permissions when repository access is reduced', async () => {
    const data = metadata();
    wrapper = mount(ProjectPermissionsCard, { propsData: { metadata: data } });
    wrapper.vm.setField(data.fields[0], 0);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.draft.mergeRequestsAccessLevel).toBe(0);
    expect(wrapper.vm.draft.buildsAccessLevel).toBe(0);
    expect(wrapper.find('input[name="project[project_feature_attributes][builds_access_level]"]').element.value).toBe('0');
    expect(wrapper.vm.disabled(data.fields[1])).toBe(true);
  });

  it('preserves forced Pages restrictions', () => {
    const data = { ...metadata(), pagesAccessControlForced: true };
    wrapper = mount(ProjectPermissionsCard, { propsData: { metadata: data, visibility: 'Private' } });
    expect(wrapper.vm.optionsFor(data.fields[3]).map((option) => option.value)).toEqual([0, 10]);
    wrapper.vm.setField(data.fields[3], 30);
    expect(wrapper.vm.draft.pagesAccessLevel).toBe(10);
  });

  it('removes diff previews when email notifications are disabled', () => {
    const data = metadata();
    wrapper = mount(ProjectPermissionsCard, { propsData: { metadata: data } });
    wrapper.vm.setField(data.fields[4], false);
    expect(wrapper.vm.draft.showDiffPreviewInEmail).toBe(false);
    expect(wrapper.vm.disabled(data.fields[5])).toBe(true);
  });

  it('fails closed on revoked capability or non-local form action', async () => {
    wrapper = mount(ProjectPermissionsCard, { propsData: { metadata: metadata() } });
    await wrapper.setProps({ metadata: { ...metadata(), allowed: false } });
    const event = { preventDefault: jest.fn() };
    wrapper.vm.validateSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(wrapper.find('form').exists()).toBe(false);
    await wrapper.setProps({ metadata: { ...metadata(), action: '//elsewhere.invalid' } });
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
