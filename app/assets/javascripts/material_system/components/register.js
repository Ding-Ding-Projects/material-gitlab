// Import the official registrations, including their own ripple and focus-ring anatomy.
// These imports are reached by the production ShellA/ShellB mount, not a preview entry.
import { MdIconButton } from '@material/web/iconbutton/icon-button.js';
import { MdTextButton } from '@material/web/button/text-button.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdOutlinedButton } from '@material/web/button/outlined-button.js';
import { MdFilledTonalButton } from '@material/web/button/filled-tonal-button.js';
import { MdElevatedButton } from '@material/web/button/elevated-button.js';
import { MdCheckbox } from '@material/web/checkbox/checkbox.js';
import { MdRadio } from '@material/web/radio/radio.js';
import { MdSwitch } from '@material/web/switch/switch.js';

export const MATERIAL_WEB_PROVENANCE = Object.freeze({
  package: '@material/web',
  version: '2.5.0',
  license: 'Apache-2.0',
  source: 'https://github.com/material-components/material-web/tree/v2.5.0',
  integrity:
    'sha512-x2Uovyq8E/Zc1xHXd9s1eBMXF5pMHVAt70pISKd0fL3Ajj4L6zQaQUY/awcfR2RDAMKXC7i4+vr0arv1YaOR/g==',
});

export const MATERIAL_WEB_CONSTRUCTORS = Object.freeze({
  'md-icon-button': MdIconButton,
  'md-text-button': MdTextButton,
  'md-filled-text-field': MdFilledTextField,
  'md-filled-button': MdFilledButton,
  'md-outlined-button': MdOutlinedButton,
  'md-filled-tonal-button': MdFilledTonalButton,
  'md-elevated-button': MdElevatedButton,
  'md-checkbox': MdCheckbox,
  'md-radio': MdRadio,
  'md-switch': MdSwitch,
});

export function assertMaterialWebRegistration(registry = globalThis.customElements) {
  Object.entries(MATERIAL_WEB_CONSTRUCTORS).forEach(([tag, Constructor]) => {
    if (registry?.get(tag) !== Constructor) {
      throw new Error(`Official Material Web registration missing or replaced: ${tag}`);
    }
  });
}

export function assertMaterialWebElement(element, expectedTag) {
  if (
    !Object.prototype.hasOwnProperty.call(MATERIAL_WEB_CONSTRUCTORS, expectedTag) ||
    element?.localName !== expectedTag ||
    element.constructor !== MATERIAL_WEB_CONSTRUCTORS[expectedTag]
  ) {
    throw new Error(`Missing or replaced official Material Web element: ${expectedTag}`);
  }
}
