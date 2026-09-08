import { MATERIAL_WEB_CONSTRUCTORS, assertMaterialWebRegistration } from './register';

// Hand-written required controls. Do not derive this list from rendered elements:
// discovery alone cannot detect a control that disappears entirely.
export const SHELL_MATERIAL_CONTROLS = Object.freeze({
  a: Object.freeze(
    [
      { id: 'brand', selector: '.material-shell__brand', tag: 'md-text-button' },
      { id: 'search', selector: '.material-shell__search', tag: 'md-filled-text-field' },
      { id: 'regex', selector: '.material-shell__regex', tag: 'md-icon-button' },
      { id: 'palette', selector: '.material-shell__palette', tag: 'md-icon-button' },
      { id: 'theme', selector: '.material-shell__theme', tag: 'md-icon-button' },
      {
        id: 'sidebar',
        selector: '.material-shell__menu',
        tag: 'md-icon-button',
        fullShellOnly: true,
      },
    ].map(Object.freeze),
  ),
  b: Object.freeze(
    [
      { id: 'brand', selector: '.material-shell__brand', tag: 'md-text-button' },
      { id: 'search', selector: '.material-shell__search', tag: 'md-filled-text-field' },
      { id: 'regex', selector: '.material-shell__regex', tag: 'md-icon-button' },
      { id: 'palette', selector: '.material-shell__palette', tag: 'md-icon-button' },
      {
        id: 'sidebar',
        selector: '.material-shell__menu',
        tag: 'md-icon-button',
        fullShellOnly: true,
      },
    ].map(Object.freeze),
  ),
});

export function validateShellMaterialControls(root, variant, { chromeOnly = false } = {}) {
  const errors = [];
  const rows = SHELL_MATERIAL_CONTROLS[variant];
  if (!rows || !root?.matches(`.material-shell--${variant}`)) {
    return { valid: false, errors: ['Missing exact shell inventory root'] };
  }
  try {
    assertMaterialWebRegistration();
  } catch (error) {
    errors.push(error.message);
  }
  rows.forEach(({ id, selector, tag, fullShellOnly }) => {
    const matches = root.querySelectorAll(selector);
    if (chromeOnly && fullShellOnly) {
      if (matches.length) errors.push(`Unexpected chrome-only control: ${id}`);
      return;
    }
    if (
      matches.length !== 1 ||
      matches[0].localName !== tag ||
      matches[0].constructor !== MATERIAL_WEB_CONSTRUCTORS[tag]
    ) {
      errors.push(`Missing or replaced official shell control: ${id}`);
    }
  });
  return { valid: errors.length === 0, errors };
}
