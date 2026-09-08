import { mountRepositorySurface } from '~/material_system/surfaces/Repository';
import initAmbiguousRefModal from '~/vue_shared/components/ref/init_ambiguous_ref_modal';

const materialRepositoryEl = document.getElementById('js-material-repository-app');
if (materialRepositoryEl) mountRepositorySurface(materialRepositoryEl);
initAmbiguousRefModal();
