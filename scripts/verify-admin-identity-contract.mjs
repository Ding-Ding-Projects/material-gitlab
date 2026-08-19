import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const mustContain = (source, needle, label) => {
  assert.ok(source.includes(needle), `${label}: missing ${needle}`);
};
const mustNotContain = (source, needle, label) => {
  assert.ok(!source.includes(needle), `${label}: forbidden ${needle}`);
};

const admin = read('app/assets/javascripts/material_system/surfaces/Admin/index.js');
const adminData = read('app/assets/javascripts/material_system/surfaces/Admin/data.js');
const manage = read('app/assets/javascripts/material_system/surfaces/Manage/Manage.vue');
const memory = read('app/assets/javascripts/material_system/surfaces/AgentMemory/AgentMemory.vue');
const memoryController = read('app/controllers/agent_memory_controller.rb');
const login = read('app/views/devise/sessions/new.html.haml');
const manageMount = read('app/assets/javascripts/material_system/surfaces/Manage/index.js');
const memoryMount = read('app/assets/javascripts/material_system/surfaces/AgentMemory/index.js');
const routes = read('config/routes.rb') + read('config/routes/admin.rb') + read('config/routes/project.rb');

mustContain(admin, "#js-material-admin", 'Admin mount');
mustContain(admin, 'actionAdapter', 'Admin real-action adapter');
mustContain(adminData, 'users: [],', 'Admin empty-state fallback');
mustNotContain(admin, 'createInitialUsers', 'Admin production mount');
mustContain(manage, 'initialEvents: { type: Array, default: () => [] }', 'Manage honest empty state');
mustNotContain(manage, 'createInitialEvents()', 'Manage production fallback');
mustContain(manageMount, "#js-material-manage", 'Manage mount');
mustContain(memoryMount, "#js-material-agent-memory", 'Agent Memory mount');
mustNotContain(memoryController, 'password', 'Agent Memory payload');
mustNotContain(memoryController, 'token', 'Agent Memory payload');
mustContain(memory, 'dataEndpoint', 'Agent Memory backend endpoint');
mustNotContain(memory, 'fetchSessions()', 'Agent Memory fixture refresh');
mustContain(login, '.material-login', 'Login design mount');
mustContain(routes, "agent-memory' => 'agent_memory#index'", 'Agent Memory route');
mustContain(routes, "post '/dashboard/actions'", 'Admin action route');
mustContain(routes, 'get :manage', 'Project Manage route');

// Negative regression: exact contract assertions must fail when a required
// registration disappears, then pass when the source is restored.
let failed = false;
try {
  mustContain(admin.replace("#js-material-admin", ''), "#js-material-admin", 'broken mount');
} catch (_error) {
  failed = true;
}
assert.equal(failed, true, 'negative mount regression must turn red');

console.log('PASS: admin, manage, agent-memory, and login contract guard');
