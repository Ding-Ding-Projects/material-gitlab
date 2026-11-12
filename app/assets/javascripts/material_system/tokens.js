/**
 * Framework-neutral Material 3 Expressive tokens used by the material-system
 * surfaces. Values are data (not CSS) so consumers can map them to their own
 * renderer.
 *
 * Generated from one seed color (#6E49CB) with the vibrant dynamic scheme of
 * @material/material-color-utilities 0.3.0. Tertiary is GitLab orange
 * (#FC6D26); success and warning are tonal palettes of GitLab green and amber.
 * Keep in step with app/assets/stylesheets/md3/_tokens.scss,
 * _tokens_dark.scss and design/Tokens.dc.html.
 */

export const MATERIAL_SEED_COLOR = '#6E49CB';

export const MATERIAL_COLOR_SCHEMES = Object.freeze({
  light: Object.freeze({
    primary: '#6E1AFF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E9DDFF',
    onPrimaryContainer: '#5300CC',
    secondary: '#6B5778',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#F2DAFF',
    onSecondaryContainer: '#523F5F',
    tertiary: '#A53D00',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFDBCD',
    onTertiaryContainer: '#7E2C00',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    success: '#006D39',
    successContainer: '#B4FFC5',
    onSuccessContainer: '#005229',
    warning: '#855300',
    warningContainer: '#FFDDB7',
    onWarningContainer: '#653E00',
    background: '#FDF7FF',
    onBackground: '#1D1A24',
    surface: '#FDF7FF',
    surfaceDim: '#DED7E6',
    surfaceBright: '#FDF7FF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F8F1FF',
    surfaceContainer: '#F2EBFA',
    surfaceContainerHigh: '#EDE5F4',
    surfaceContainerHighest: '#E7E0EF',
    onSurface: '#1D1A24',
    surfaceVariant: '#E7DFF2',
    onSurfaceVariant: '#494453',
    outline: '#7A7484',
    outlineVariant: '#CBC3D5',
    scrim: '#000000',
    inverseSurface: '#322F3A',
    inverseOnSurface: '#F5EEFD',
    inversePrimary: '#CFBDFF',
  }),
  dark: Object.freeze({
    primary: '#CFBDFF',
    onPrimary: '#3A0093',
    primaryContainer: '#5300CC',
    onPrimaryContainer: '#E9DDFF',
    secondary: '#D6BEE4',
    onSecondary: '#3B2948',
    secondaryContainer: '#523F5F',
    onSecondaryContainer: '#F2DAFF',
    tertiary: '#FFB597',
    onTertiary: '#591D00',
    tertiaryContainer: '#7E2C00',
    onTertiaryContainer: '#FFDBCD',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    success: '#75DB94',
    successContainer: '#005229',
    onSuccessContainer: '#91F8AE',
    warning: '#FFB95E',
    warningContainer: '#653E00',
    onWarningContainer: '#FFDDB7',
    background: '#15121C',
    onBackground: '#E7E0EF',
    surface: '#15121C',
    surfaceDim: '#15121C',
    surfaceBright: '#3B3743',
    surfaceContainerLowest: '#0F0D16',
    surfaceContainerLow: '#1D1A24',
    surfaceContainer: '#211E28',
    surfaceContainerHigh: '#2C2833',
    surfaceContainerHighest: '#37333E',
    onSurface: '#E7E0EF',
    surfaceVariant: '#494453',
    onSurfaceVariant: '#CBC3D5',
    outline: '#948E9F',
    outlineVariant: '#494453',
    scrim: '#000000',
    inverseSurface: '#E7E0EF',
    inverseOnSurface: '#322F3A',
    inversePrimary: '#6E1AFF',
  }),
});

export const MATERIAL_TYPOGRAPHY = Object.freeze({
  displayLarge: Object.freeze({ size: 57, lineHeight: 64, weight: 780, tracking: -2 }),
  displayMedium: Object.freeze({ size: 45, lineHeight: 52, weight: 760, tracking: -1.35 }),
  displaySmall: Object.freeze({ size: 36, lineHeight: 44, weight: 740, tracking: -1.08 }),
  headlineLarge: Object.freeze({ size: 32, lineHeight: 40, weight: 720, tracking: -0.8 }),
  headlineMedium: Object.freeze({ size: 28, lineHeight: 36, weight: 700, tracking: -0.56 }),
  headlineSmall: Object.freeze({ size: 24, lineHeight: 32, weight: 690, tracking: -0.36 }),
  titleLarge: Object.freeze({ size: 20, lineHeight: 28, weight: 680, tracking: -0.2 }),
  titleMedium: Object.freeze({ size: 16, lineHeight: 24, weight: 650, tracking: 0 }),
  titleSmall: Object.freeze({ size: 15, lineHeight: 22, weight: 650, tracking: 0 }),
  bodyLarge: Object.freeze({ size: 16, lineHeight: 24, weight: 400, tracking: 0 }),
  bodyMedium: Object.freeze({ size: 14, lineHeight: 20, weight: 400, tracking: 0 }),
  bodySmall: Object.freeze({ size: 12.5, lineHeight: 16, weight: 400, tracking: 0 }),
  labelLarge: Object.freeze({ size: 14, lineHeight: 20, weight: 650, tracking: 0 }),
  labelMedium: Object.freeze({ size: 12.5, lineHeight: 16, weight: 650, tracking: 0 }),
  labelSmall: Object.freeze({ size: 11.5, lineHeight: 16, weight: 650, tracking: 0.46 }),
});

export const MATERIAL_SHAPE = Object.freeze({
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  largeIncreased: 20,
  extraLarge: 28,
  extraLargeIncreased: 32,
  extraExtraLarge: 48,
  full: 9999,
});
export const MATERIAL_ELEVATION = Object.freeze({
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
});
export const MATERIAL_MOTION = Object.freeze({
  durationShort: 200,
  durationMedium: 350,
  durationLong: 500,
  easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  easingEmphasized: 'cubic-bezier(0.3, 0, 0.1, 1)',
  easingSpatialFast: 'cubic-bezier(0.42, 1.67, 0.21, 0.9)',
  easingSpatialDefault: 'cubic-bezier(0.38, 1.21, 0.22, 1)',
  easingEffects: 'cubic-bezier(0.34, 0.8, 0.34, 1)',
});
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
    density: Object.freeze({
      name: density in MATERIAL_DENSITY ? density : 'comfortable',
      scale: densityScale,
    }),
  });
}
