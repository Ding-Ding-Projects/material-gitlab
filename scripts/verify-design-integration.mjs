import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const contractPath = path.join(root, 'app/assets/javascripts/material_system/surfaces/contracts.js');
const adminEntrypoint = path.join(root, 'app/assets/javascripts/pages/admin/dashboard/index.js');

const contractSource = fs.readFileSync(contractPath, 'utf8');
const adminSource = fs.readFileSync(adminEntrypoint, 'utf8');
const expectedIds = [
  'admin', 'agent-memory', 'analyze', 'build', 'code', 'command-palette', 'deploy', 'epics', 'issues', 'login',
  'manage', 'merge-requests', 'monitor', 'operate', 'pipelines', 'plan', 'regex-builder', 'repository', 'secure',
  'security', 'settings', 'shell-a', 'shell-b', 'sidebar', 'todos',
];

const inventorySource = contractSource.slice(contractSource.indexOf('DESIGN_ROUTE_INTEGRATION_CONTRACTS'));
const missing = expectedIds.filter((id) => !inventorySource.includes(`id: 'surface.${id}'`));
if (missing.length) throw new Error(`Missing design route contracts: ${missing.join(', ')}`);
if ((inventorySource.match(/id: 'surface\./g) || []).length !== expectedIds.length) {
  throw new Error('Design route integration inventory must contain exactly 25 rows');
}
if (!/^import \{ initAdminMaterial \} from '~\/material_system\/surfaces\/Admin';$/m.test(adminSource)) {
  throw new Error('Admin dashboard must import initAdminMaterial from its page-specific surface module');
}
if (!/^initAdminMaterial\(\);$/m.test(adminSource)) {
  throw new Error('Admin dashboard must initialize the Material admin surface');
}

process.stdout.write('Design route integration inventory is complete and the admin route is wired.\n');
