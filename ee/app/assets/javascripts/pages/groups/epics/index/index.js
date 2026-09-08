import { mountEpics } from '~/material_system/surfaces/Epics';

const root = document.querySelector('[data-material-epics]');

if (root) {
  const config = JSON.parse(root.dataset.materialEpicsConfig || '{}');
  mountEpics(root, {
    currentUser: config.currentUser || { name: '', initials: '' },
    permissions: config.permissions || {},
    createPath: config.createPath || '',
    roadmapPath: config.roadmapPath || '',
  });
}
