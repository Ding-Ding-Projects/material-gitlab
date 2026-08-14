import {
  MATERIAL_COLOR_SCHEMES,
  MATERIAL_TYPOGRAPHY,
  UNIVERSAL_FEATURE_CONTRACTS,
  createMaterialTokens,
} from '~/material_system';

const parseHex = (value) => value.match(/[a-f\d]{2}/gi).map((component) => parseInt(component, 16));
const linearize = (component) => {
  const value = component / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = (value) => {
  const [red, green, blue] = parseHex(value).map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const contrast = (foreground, background) => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

describe('Material System accessibility contracts', () => {
  it.each(['light', 'dark'])('keeps core %s text roles at WCAG AA contrast', (scheme) => {
    const colors = MATERIAL_COLOR_SCHEMES[scheme];

    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onBackground, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onSurface, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onError, colors.error)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps readable typography metrics and CJK-safe consumer ownership explicit', () => {
    Object.values(MATERIAL_TYPOGRAPHY).forEach(({ size, lineHeight, weight }) => {
      expect(size).toBeGreaterThan(0);
      expect(lineHeight).toBeGreaterThanOrEqual(size);
      expect(weight).toBeGreaterThanOrEqual(400);
    });

    expect(createMaterialTokens().typography).toBe(MATERIAL_TYPOGRAPHY);
  });

  it('requires keyboard, screen-reader, contrast, and responsive sizing evidence per surface', () => {
    const contract = UNIVERSAL_FEATURE_CONTRACTS.find(
      ({ id }) => id === 'accessibility-responsive-sizing',
    );

    expect(contract).toMatchObject({
      id: 'accessibility-responsive-sizing',
      required: true,
      title: 'Keyboard, screen-reader, contrast, and responsive sizing',
      evidenceSlots: expect.arrayContaining([
        'implementation',
        'documentation',
        'tests',
        'builtArtifactInteraction',
        'captures',
      ]),
    });
  });
});
