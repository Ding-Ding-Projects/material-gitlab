import initAdminStatisticsPanel from '~/admin/statistics_panel/index';
import initVueAlerts from '~/vue_alerts';
import initAdmin from './admin';
import { initAdminMaterial } from '~/material_system/surfaces/Admin';

initVueAlerts();

const statisticsPanelContainer = document.getElementById('js-admin-statistics-container');
initAdmin();
initAdminStatisticsPanel(statisticsPanelContainer);
initAdminMaterial();
