import initBlobShow from '~/blob/show/show_blob_bundle';
import { mountRepositorySurface } from '~/material_system/surfaces/Repository';

initBlobShow();

const materialRepositoryEl = document.getElementById('js-material-repository-app');
if (materialRepositoryEl) mountRepositorySurface(materialRepositoryEl);
