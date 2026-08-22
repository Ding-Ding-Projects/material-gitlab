import {
  SHARED_SHELL_CONTRACTS,
  createAnalyzeDataAdapter,
  validateSharedShellContracts,
} from '~/material_system/surfaces';

describe('shared shell design contracts', () => {
  it('keeps one explicit production mount for each shared design surface', () => {
    expect(validateSharedShellContracts()).toEqual({ valid: true, errors: [] });
    expect(SHARED_SHELL_CONTRACTS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'surface.shell-a', reference: 'design/Shell A.dc.html' }),
      expect.objectContaining({ id: 'surface.shell-b', reference: 'design/Shell B.dc.html' }),
      expect.objectContaining({ id: 'surface.sidebar', mount: '.m3-shell-sidebar-host' }),
      expect.objectContaining({ id: 'surface.command-palette', mount: '#material-command-palette-root' }),
      expect.objectContaining({ id: 'surface.regex-builder', mount: '[data-regex-builder-target]' }),
      expect.objectContaining({ id: 'surface.analyze', mount: '#js-explore-analytics-dashboards' }),
    ]));
  });

  it('turns red when one exact contract is removed and green when restored', () => {
    const reduced = SHARED_SHELL_CONTRACTS.filter(({ id }) => id !== 'surface.regex-builder');
    expect(validateSharedShellContracts(reduced)).toEqual({
      valid: false,
      errors: ['missing shared-shell contract: surface.regex-builder'],
    });
    expect(validateSharedShellContracts([...reduced, SHARED_SHELL_CONTRACTS.find(({ id }) => id === 'surface.regex-builder')])).toEqual({ valid: true, errors: [] });
  });

  it('adapts only supplied analytics dashboard data and has an honest empty state', () => {
    expect(createAnalyzeDataAdapter(null)).toEqual({ tabs: [], views: {} });
    const adapter = createAnalyzeDataAdapter({ views: { value: { label: 'Value stream', chartTitle: 'Time in stage', stats: [], bars: [] } } });
    expect(adapter.tabs).toEqual([{ id: 'value', label: 'Value stream' }]);
    expect(adapter.views.value.chartTitle).toBe('Time in stage');
  });
});
