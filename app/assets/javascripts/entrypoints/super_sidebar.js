import '~/webpack';
import '~/commons';
// Configure the JS path helpers with the relative URL root before any sidebar
// component renders. Otherwise helpers like `destroyUserSessionPath()` emit
// paths without the root (e.g. `/users/sign_out` instead of
// `/relative/users/sign_out`) on relative URL installations. Unlike `main.js`,
// this entrypoint does not import `~/behaviors`, where this is configured.
import '~/behaviors/configure_path_helpers';
import {
  initSuperSidebar,
  initPageBreadcrumbs,
  getSuperSidebarData,
  initSuperTopbar,
} from '~/super_sidebar/super_sidebar_bundle';
import { mountAuthenticatedShell, mountSidebar } from '~/material_system/mounts';

const superSidebarData = getSuperSidebarData();
const materialSidebarHost = document.querySelector('.m3-shell-sidebar-host[data-material-shell]');
const materialTopbarHost = document.querySelector('.m3-shell-topbar-host[data-material-shell]');

if (materialSidebarHost && superSidebarData) {
  mountSidebar(materialSidebarHost, { data: superSidebarData.sidebarData });
} else if (superSidebarData) {
  initSuperSidebar(superSidebarData);
}

if (materialTopbarHost && superSidebarData) {
  mountAuthenticatedShell(materialTopbarHost, { data: superSidebarData.sidebarData });
} else if (superSidebarData) {
  initSuperTopbar(superSidebarData);
}
initPageBreadcrumbs();
