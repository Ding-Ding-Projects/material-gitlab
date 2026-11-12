// Applies Material settings, ADHD modes and accessibility tools to the live page through
// attributes and custom properties on <html>. Stylesheets read these attributes
// (`md3/components/_feature_layer.scss`), so a setting that is saved also changes what
// the page looks like.

export function applyToDocument(
  { settings = {}, adhd = {}, a11y = {} } = {},
  root = globalThis.document?.documentElement,
) {
  if (!root) return null;
  const motionReduced = settings.motion === 'reduced' || Boolean(adhd.lowStimulation);
  const attrs = {
    'data-m3-motion': motionReduced ? 'reduced' : 'full',
    'data-m3-density': settings.density || 'comfortable',
    'data-m3-language': settings.language || 'en',
    'data-m3-focus': adhd.focus ? 'on' : null,
    'data-m3-low-stimulation': adhd.lowStimulation ? 'on' : null,
    'data-m3-high-contrast': a11y.highContrast ? 'on' : null,
    'data-m3-focus-ring': a11y.alwaysFocusRing ? 'always' : null,
    'data-m3-large-targets': a11y.largerTargets ? 'on' : null,
  };
  Object.entries(attrs).forEach(([name, value]) => {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  });
  const scale = Number.isFinite(settings.fontScale) ? settings.fontScale : 1;
  root.style.setProperty('--m3-font-scale', String(scale));
  if (scale === 1) root.style.removeProperty('font-size');
  else root.style.setProperty('font-size', `${Math.round(scale * 100)}%`);
  if (settings.accentColor) root.style.setProperty('--m3-seed', settings.accentColor);
  return attrs;
}
