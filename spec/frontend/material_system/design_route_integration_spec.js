import fs from 'fs';
import path from 'path';
import {
  DESIGN_ROUTE_INTEGRATION_CONTRACTS,
  DESIGN_ROUTE_INTEGRATION_IDS,
  validateDesignRouteIntegrationContracts,
} from '~/material_system/surfaces';

const root = path.resolve(__dirname, '../../..');

const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Material design route integration inventory', () => {
  it('keeps all 25 checked-in design surfaces in one explicit route inventory', () => {
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS).toHaveLength(25);
    expect(DESIGN_ROUTE_INTEGRATION_IDS).toEqual([
      'surface.admin', 'surface.agent-memory', 'surface.analyze', 'surface.build', 'surface.code',
      'surface.command-palette', 'surface.deploy', 'surface.epics', 'surface.issues', 'surface.login',
      'surface.manage', 'surface.merge-requests', 'surface.monitor', 'surface.operate', 'surface.pipelines',
      'surface.plan', 'surface.regex-builder', 'surface.repository', 'surface.secure', 'surface.security',
      'surface.settings', 'surface.shell-a', 'surface.shell-b', 'surface.sidebar', 'surface.todos',
    ]);
    expect(validateDesignRouteIntegrationContracts()).toEqual({ valid: true, errors: [] });
    DESIGN_ROUTE_INTEGRATION_CONTRACTS.forEach(({ reference }) => {
      expect(fs.existsSync(path.join(root, reference))).toBe(true);
    });
  });

  it('wires each claimed production route through its exact existing entrypoint and host', () => {
    DESIGN_ROUTE_INTEGRATION_CONTRACTS.filter(({ status }) => status === 'wired').forEach((contract) => {
      const entrypoint = source(contract.entrypoint);
      expect(entrypoint).toMatch(new RegExp(`\\b${contract.initializer}\\s*\\(`));
      const view = {
        'surface.admin': 'app/views/admin/dashboard/index.html.haml',
        'surface.agent-memory': 'app/views/agent_memory/index.html.haml',
        'surface.manage': 'app/views/projects/manage.html.haml',
        'surface.repository': 'app/assets/javascripts/repository/index.js',
        'surface.todos': 'app/views/dashboard/todos/index.html.haml',
      }[contract.id];
      expect(source(view)).toContain(contract.host);
    });
  });

  it('keeps the admin dashboard transition banner and adds the real Material initializer', () => {
    const entrypoint = source('app/assets/javascripts/pages/admin/dashboard/index.js');

    expect(entrypoint).toMatch(/^import \{ initJHTransitionBanner \}.*$/m);
    expect(entrypoint).toMatch(/^import \{ initAdminMaterial \}.*$/m);
    expect(entrypoint).toMatch(/^initJHTransitionBanner\(\);$/m);
    expect(entrypoint).toMatch(/^initAdminMaterial\(\);$/m);
  });

  it('turns red when an exact route row or a required wired initializer is removed', () => {
    const withoutAdmin = DESIGN_ROUTE_INTEGRATION_CONTRACTS.filter(({ id }) => id !== 'surface.admin');
    expect(validateDesignRouteIntegrationContracts(withoutAdmin)).toMatchObject({ valid: false });
    expect(validateDesignRouteIntegrationContracts(withoutAdmin).errors).toContain(
      'missing route integration contract: surface.admin',
    );

    const withoutInitializer = DESIGN_ROUTE_INTEGRATION_CONTRACTS.map((contract) =>
      contract.id === 'surface.admin' ? { ...contract, initializer: '' } : contract,
    );
    expect(validateDesignRouteIntegrationContracts(withoutInitializer).errors).toContain(
      'contracts[0].initializer is required for wired routes',
    );
  });
});
