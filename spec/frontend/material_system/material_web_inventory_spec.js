import { mount } from '@vue/test-utils';
import ShellA from '~/material_system/surfaces/ShellA/ShellA.vue';
import ShellB from '~/material_system/surfaces/ShellB/ShellB.vue';
import {
  SHELL_MATERIAL_CONTROLS,
  validateShellMaterialControls,
} from '~/material_system/components/inventory';
import {
  assertMaterialWebRegistration,
  MATERIAL_WEB_CONSTRUCTORS,
  MATERIAL_WEB_PROVENANCE,
} from '~/material_system/components/register';
import packageJson from '../../../package.json';
import materialWebPackage from '@material/web/package.json';

describe('hand-written official shell component inventory', () => {
  let wrapper;
  afterEach(() => {
    wrapper?.destroy();
  });

  it('pins the installed package and names every required shell control explicitly', () => {
    expect(packageJson.dependencies['@material/web']).toBe(MATERIAL_WEB_PROVENANCE.version);
    expect(materialWebPackage.version).toBe(MATERIAL_WEB_PROVENANCE.version);
    expect(materialWebPackage.license).toBe(MATERIAL_WEB_PROVENANCE.license);
    expect(SHELL_MATERIAL_CONTROLS.a.map(({ id }) => id)).toEqual([
      'brand',
      'search',
      'regex',
      'palette',
      'theme',
      'sidebar',
    ]);
    expect(SHELL_MATERIAL_CONTROLS.b.map(({ id }) => id)).toEqual([
      'brand',
      'search',
      'regex',
      'palette',
      'sidebar',
    ]);
  });

  it.each(['md-icon-button', 'md-text-button', 'md-filled-text-field'])(
    'rejects an impostor registration for %s, then accepts the restored constructor',
    (tag) => {
      const get = (name) => (name === tag ? HTMLElement : MATERIAL_WEB_CONSTRUCTORS[name]);
      expect(() => assertMaterialWebRegistration({ get })).toThrow(
        `Official Material Web registration missing or replaced: ${tag}`,
      );
      expect(() => assertMaterialWebRegistration()).not.toThrow();
    },
  );

  describe.each([
    ['a', ShellA],
    ['b', ShellB],
  ])('Shell %s', (variant, Shell) => {
    it('rejects every exact removed or generic replacement control, then passes after restoration', () => {
      wrapper = mount(Shell, { stubs: { MaterialSidebar: true } });
      expect(validateShellMaterialControls(wrapper.element, variant)).toEqual({
        valid: true,
        errors: [],
      });
      SHELL_MATERIAL_CONTROLS[variant].forEach(({ id, selector }) => {
        const official = wrapper.element.querySelector(selector);
        const placeholder = document.createElement('button');
        placeholder.className = official.className;
        official.replaceWith(placeholder);
        expect(validateShellMaterialControls(wrapper.element, variant).errors).toContain(
          `Missing or replaced official shell control: ${id}`,
        );
        placeholder.replaceWith(official);
        expect(validateShellMaterialControls(wrapper.element, variant).valid).toBe(true);
        const parent = official.parentNode;
        const next = official.nextSibling;
        official.remove();
        expect(validateShellMaterialControls(wrapper.element, variant).valid).toBe(false);
        parent.insertBefore(official, next);
        expect(validateShellMaterialControls(wrapper.element, variant).valid).toBe(true);
      });
    });

    it('accounts for the explicitly separate chrome-only mount', () => {
      wrapper = mount(Shell, { propsData: { chromeOnly: true } });
      expect(
        validateShellMaterialControls(wrapper.element, variant, { chromeOnly: true }).valid,
      ).toBe(true);
      expect(validateShellMaterialControls(wrapper.element, variant).valid).toBe(false);
    });
  });
});
