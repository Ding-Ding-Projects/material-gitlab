import { mountProjectSettings } from '~/material_system/surfaces/Settings';

const root = document.querySelector('[data-material-project-settings]');
if (root) {
  try {
    mountProjectSettings(root);
  } catch (_error) {
    root.setAttribute('role', 'alert');
    root.textContent = 'Project settings could not initialize. Reload this project and try again.';
  }
}
