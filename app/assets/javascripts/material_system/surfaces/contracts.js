/** Hand-written stable inventory for the six shared-shell design contracts. */
export const SHARED_SHELL_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'surface.shell-a', reference: 'design/Shell A.dc.html', mount: '.m3-shell-topbar-host', kind: 'authenticated-shell' }),
  Object.freeze({ id: 'surface.shell-b', reference: 'design/Shell B.dc.html', mount: '.m3-shell-topbar-host', kind: 'unauthenticated-shell' }),
  Object.freeze({ id: 'surface.sidebar', reference: 'design/Sidebar.dc.html', mount: '.m3-shell-sidebar-host', kind: 'sidebar' }),
  Object.freeze({ id: 'surface.command-palette', reference: 'design/Command Palette.dc.html', mount: '#material-command-palette-root', kind: 'overlay' }),
  Object.freeze({ id: 'surface.regex-builder', reference: 'design/Regex Builder.dc.html', mount: '[data-regex-builder-target]', kind: 'overlay' }),
  Object.freeze({ id: 'surface.analyze', reference: 'design/Analyze.dc.html', mount: '#js-explore-analytics-dashboards', kind: 'analytics' }),
]);

export function validateSharedShellContracts(contracts = SHARED_SHELL_CONTRACTS) {
  const errors = [];
  const ids = new Set();
  contracts.forEach((contract, index) => {
    if (!contract || !contract.id) errors.push(`contracts[${index}].id is required`);
    if (ids.has(contract?.id)) errors.push(`duplicate shared-shell contract: ${contract.id}`);
    if (contract?.id) ids.add(contract.id);
    if (!contract?.reference) errors.push(`contracts[${index}].reference is required`);
    if (!contract?.mount) errors.push(`contracts[${index}].mount is required`);
  });
  SHARED_SHELL_CONTRACTS.forEach(({ id }) => {
    if (!ids.has(id)) errors.push(`missing shared-shell contract: ${id}`);
  });
  return { valid: errors.length === 0, errors };
}
