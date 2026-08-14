/**
 * Framework-neutral Material 3 tokens used by the material-system surfaces.
 * Values are data (not CSS) so consumers can map them to their own renderer.
 */

export const MATERIAL_COLOR_SCHEMES = Object.freeze({
  light: Object.freeze({
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',
    tertiary: '#7D5260',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD8E4',
    onTertiaryContainer: '#31111D',
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',
    background: '#FFFBFE',
    onBackground: '#1C1B1F',
    surface: '#FFFBFE',
    onSurface: '#1C1B1F',
    surfaceVariant: '#E7E0EC',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
  }),
  dark: Object.freeze({
    primary: '#D0BCFF',
    onPrimary: '#381E72',
    primaryContainer: '#4F378B',
    onPrimaryContainer: '#EADDFF',
    secondary: '#CCC2DC',
    onSecondary: '#332D41',
    secondaryContainer: '#4A4458',
    onSecondaryContainer: '#E8DEF8',
    tertiary: '#EFB8C8',
    onTertiary: '#492532',
    tertiaryContainer: '#633B48',
    onTertiaryContainer: '#FFD8E4',
    error: '#F2B8B5',
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',
    background: '#1C1B1F',
    onBackground: '#E6E1E5',
    surface: '#1C1B1F',
    onSurface: '#E6E1E5',
    surfaceVariant: '#49454F',
    onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
    outlineVariant: '#49454F',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#6750A4',
  }),
});

export const MATERIAL_TYPOGRAPHY = Object.freeze({
  displayLarge: Object.freeze({ size: 57, lineHeight: 64, weight: 400, tracking: -0.25 }),
  displayMedium: Object.freeze({ size: 45, lineHeight: 52, weight: 400, tracking: 0 }),
  displaySmall: Object.freeze({ size: 36, lineHeight: 44, weight: 400, tracking: 0 }),
  headlineLarge: Object.freeze({ size: 32, lineHeight: 40, weight: 400, tracking: 0 }),
  headlineMedium: Object.freeze({ size: 28, lineHeight: 36, weight: 400, tracking: 0 }),
  headlineSmall: Object.freeze({ size: 24, lineHeight: 32, weight: 400, tracking: 0 }),
  titleLarge: Object.freeze({ size: 22, lineHeight: 28, weight: 400, tracking: 0 }),
  titleMedium: Object.freeze({ size: 16, lineHeight: 24, weight: 500, tracking: 0.15 }),
  titleSmall: Object.freeze({ size: 14, lineHeight: 20, weight: 500, tracking: 0.1 }),
  bodyLarge: Object.freeze({ size: 16, lineHeight: 24, weight: 400, tracking: 0.5 }),
  bodyMedium: Object.freeze({ size: 14, lineHeight: 20, weight: 400, tracking: 0.25 }),
  bodySmall: Object.freeze({ size: 12, lineHeight: 16, weight: 400, tracking: 0.4 }),
  labelLarge: Object.freeze({ size: 14, lineHeight: 20, weight: 500, tracking: 0.1 }),
  labelMedium: Object.freeze({ size: 12, lineHeight: 16, weight: 500, tracking: 0.5 }),
  labelSmall: Object.freeze({ size: 11, lineHeight: 16, weight: 500, tracking: 0.5 }),
});

export const MATERIAL_SHAPE = Object.freeze({ extraSmall: 4, small: 8, medium: 12, large: 16, extraLarge: 28, full: 9999 });
export const MATERIAL_ELEVATION = Object.freeze({ level0: 0, level1: 1, level2: 3, level3: 6, level4: 8, level5: 12 });
export const MATERIAL_MOTION = Object.freeze({ durationShort: 150, durationMedium: 300, durationLong: 500, easingStandard: 'cubic-bezier(0.2, 0, 0, 1)', easingEmphasized: 'cubic-bezier(0.2, 0, 0, 1)' });
export const MATERIAL_DENSITY = Object.freeze({ comfortable: 0, compact: -1, spacious: 1 });

export function createMaterialTokens({ scheme = 'light', density = 'comfortable' } = {}) {
  const colorScheme = MATERIAL_COLOR_SCHEMES[scheme] || MATERIAL_COLOR_SCHEMES.light;
  const densityScale = MATERIAL_DENSITY[density] ?? MATERIAL_DENSITY.comfortable;
  return Object.freeze({
    color: colorScheme,
    typography: MATERIAL_TYPOGRAPHY,
    shape: MATERIAL_SHAPE,
    elevation: MATERIAL_ELEVATION,
    motion: MATERIAL_MOTION,
    density: Object.freeze({ name: density in MATERIAL_DENSITY ? density : 'comfortable', scale: densityScale }),
  });
}
