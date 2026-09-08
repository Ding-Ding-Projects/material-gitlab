import fs from 'fs';
import path from 'path';
import { DESIGN_ROUTE_INTEGRATION_CONTRACTS, DESIGN_ROUTE_INTEGRATION_IDS, validateDesignRouteIntegrationContracts } from '~/material_system/surfaces';

const root = path.resolve(__dirname, '../../..');

describe('Material design route integration inventory', () => {
  it('keeps all 25 checked-in design surfaces in an explicit inventory', () => {
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS).toHaveLength(25);
    expect(DESIGN_ROUTE_INTEGRATION_IDS).toHaveLength(25);
    expect(validateDesignRouteIntegrationContracts()).toEqual({ valid: true, errors: [] });
    DESIGN_ROUTE_INTEGRATION_CONTRACTS.forEach(({ reference, runtimeEvidence }) => {
      expect(fs.existsSync(path.join(root, reference))).toBe(true);
      expect(runtimeEvidence).toBe('not-captured');
    });
  });

  it('keeps source registration distinct from runtime proof', () => {
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS.find(({ id }) => id === 'surface.analyze')).toMatchObject({ status: 'wired', route: '/:namespace/:project/-/value_stream_analytics', entrypoint: 'app/assets/javascripts/pages/projects/cycle_analytics/show/index.js', initializer: 'mountAnalyze', host: '#js-material-analyze', runtimeEvidence: 'not-captured' });
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS.find(({ id }) => id === 'surface.shell-a')).toMatchObject({ status: 'wired', preference: { key: 'shellVariant', value: 'a' }, runtimeEvidence: 'not-captured' });
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS.find(({ id }) => id === 'surface.shell-b')).toMatchObject({ status: 'wired', runtimeEvidence: 'not-captured' });
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS.find(({ id }) => id === 'surface.secure')).toMatchObject({ status: 'wired', runtimeEvidence: 'not-captured' });
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS.find(({ id }) => id === 'surface.settings')).toMatchObject({ status: 'wired', route: '/:namespace/:project/edit', entrypoint: 'app/assets/javascripts/pages/projects/edit/index.js', initializer: 'mountProjectSettings', host: '#material-project-settings', runtimeEvidence: 'not-captured' });
    expect(DESIGN_ROUTE_INTEGRATION_CONTRACTS.find(({ id }) => id === 'surface.login')).toMatchObject({ status: 'server-rendered', runtimeEvidence: 'not-captured' });
  });

  it('turns red when an exact row, import edge, initializer, or host is removed', () => {
    const withoutRow = DESIGN_ROUTE_INTEGRATION_CONTRACTS.filter(({ id }) => id !== 'surface.admin');
    expect(validateDesignRouteIntegrationContracts(withoutRow).errors).toContain('missing route integration contract: surface.admin');
    const withoutImport = DESIGN_ROUTE_INTEGRATION_CONTRACTS.map((row) => row.id === 'surface.admin' ? { ...row, importSource: '' } : row);
    expect(validateDesignRouteIntegrationContracts(withoutImport).errors).toContain('contracts[0].importSource is required for source-wired routes');
    const withoutInitializer = DESIGN_ROUTE_INTEGRATION_CONTRACTS.map((row) => row.id === 'surface.admin' ? { ...row, initializer: '' } : row);
    expect(validateDesignRouteIntegrationContracts(withoutInitializer).errors).toContain('contracts[0].initializer is required for source-wired routes');
    const withoutHost = DESIGN_ROUTE_INTEGRATION_CONTRACTS.map((row) => row.id === 'surface.admin' ? { ...row, host: '' } : row);
    expect(validateDesignRouteIntegrationContracts(withoutHost).errors).toContain('contracts[0].host is required for source-wired routes');
  });
});
