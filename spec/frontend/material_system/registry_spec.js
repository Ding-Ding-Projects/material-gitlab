import {
  CANONICAL_FEATURE_IDS,
  EVIDENCE_SLOTS,
  UNIVERSAL_FEATURE_CONTRACTS,
  assertCanonicalFeatureRegistry,
  createFeatureRegistry,
  createRegistry,
  createSurfaceInventory,
  validateRegistry,
} from '~/material_system';

const verifiedRef = (ref) => ({ ref, verified: true });

const buildValidRegistry = () => {
  const surface = createSurfaceInventory({
    id: 'surface.projects-overview',
    kind: 'page',
    title: 'Projects overview',
    route: '/dashboard/projects',
  });

  surface.coverage = surface.coverage.map((row) => ({
    ...row,
    status: 'verified',
    evidence: {
      implementation: verifiedRef(`implementation:${row.contractId}`),
      documentation: verifiedRef(`documentation:${row.contractId}`),
      localization: verifiedRef(`localization:${row.contractId}`),
      persistence: verifiedRef(`persistence:${row.contractId}`),
      tests: verifiedRef(`tests:${row.contractId}`),
      builtArtifactInteraction: verifiedRef(`interaction:${row.contractId}`),
      captures: [verifiedRef(`capture:${row.contractId}`)],
    },
    negativeRegression: verifiedRef(`negative-regression:${row.contractId}`),
  }));

  return createRegistry({
    surfaces: [surface],
    negativeRegression: verifiedRef('negative-regression:registry'),
  });
};

describe('Material System universal feature registry', () => {
  it('keeps the canonical feature IDs unique and every evidence slot explicit', () => {
    const ids = UNIVERSAL_FEATURE_CONTRACTS.map(({ id }) => id);

    expect(new Set(ids)).toHaveProperty('size', ids.length);
    expect(CANONICAL_FEATURE_IDS).toEqual(ids);
    expect(ids).toEqual(
      expect.arrayContaining([
        'accessibility-responsive-sizing',
        'command-palette',
        'material-appearance',
        'status-hub',
      ]),
    );
    expect(EVIDENCE_SLOTS).toEqual([
      'implementation',
      'documentation',
      'localization',
      'persistence',
      'tests',
      'builtArtifactInteraction',
      'captures',
    ]);
  });

  it('accepts a complete per-surface inventory', () => {
    const registry = buildValidRegistry();

    expect(createFeatureRegistry).toBe(createRegistry);
    expect(validateRegistry(registry)).toEqual({ valid: true, errors: [] });
    expect(assertCanonicalFeatureRegistry(registry)).toBe(registry);
  });

  it('turns red when one exact canonical registry row is deliberately removed and green when restored', () => {
    const registry = buildValidRegistry();
    const removedId = 'accessibility-responsive-sizing';
    const removedRow = registry.features.find(({ id }) => id === removedId);

    registry.features = registry.features.filter(({ id }) => id !== removedId);

    expect(validateRegistry(registry)).toEqual({
      valid: false,
      errors: [`missing canonical feature: ${removedId}`],
    });

    registry.features.push(removedRow);

    expect(validateRegistry(registry)).toEqual({ valid: true, errors: [] });
  });

  it('rejects a surface that drops one exact contract even when a similarly named row remains', () => {
    const registry = buildValidRegistry();
    const surface = registry.surfaces[0];
    surface.coverage.push({
      ...surface.coverage[0],
      contractId: 'accessibility-responsive-sizing-extra',
    });
    surface.coverage = surface.coverage.filter(
      ({ contractId }) => contractId !== 'accessibility-responsive-sizing',
    );
    const extraIndex = surface.coverage.findIndex(
      ({ contractId }) => contractId === 'accessibility-responsive-sizing-extra',
    );

    const result = validateRegistry(registry);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `surfaces[0].coverage[${extraIndex}]: unknown contract accessibility-responsive-sizing-extra`,
    );
    expect(result.errors).toContain(
      'surfaces[0]: missing contract accessibility-responsive-sizing',
    );
    expect(() => assertCanonicalFeatureRegistry(registry)).toThrow(
      'Invalid canonical feature registry',
    );
  });

  it.each(EVIDENCE_SLOTS)('rejects missing or unverified %s evidence', (slot) => {
    const registry = buildValidRegistry();
    const row = registry.surfaces[0].coverage[0];
    row.evidence[slot] = slot === 'captures' ? [] : null;

    const result = validateRegistry(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes(`evidence.${slot}`))).toBe(true);
  });
});
