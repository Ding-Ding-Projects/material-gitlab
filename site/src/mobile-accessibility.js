export function applyMobileAccessibility(root = document) {
  root.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"]').forEach((control) => {
    control.classList.add('touch-target');
    if (!control.hasAttribute('tabindex') && control.matches('[role="button"], [role="tab"]')) control.tabIndex = 0;
  });
  root.querySelectorAll('[role="tablist"]').forEach((list) => { if (!list.hasAttribute('aria-orientation')) list.setAttribute('aria-orientation', 'horizontal'); });
  root.querySelectorAll('[data-overflow-container]').forEach((container) => { container.style.overflowX = 'auto'; container.style.maxWidth = '100%'; });
  if (matchMedia?.('(prefers-reduced-motion: reduce)').matches) root.documentElement?.classList.add('reduce-motion');
  return root;
}
export function installFocusRing(root = document) {
  let keyboardNavigation = false;
  const onKeydown = (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') keyboardNavigation = true;
  };
  const onPointer = () => { keyboardNavigation = false; };
  const onFocus = (event) => {
    if (keyboardNavigation) event.target?.classList?.add('keyboard-focus');
  };
  const onBlur = (event) => event.target?.classList?.remove('keyboard-focus');
  root.addEventListener('keydown', onKeydown, true);
  root.addEventListener('pointerdown', onPointer, true);
  root.addEventListener('focusin', onFocus);
  root.addEventListener('focusout', onBlur);
  return () => {
    root.removeEventListener('keydown', onKeydown, true);
    root.removeEventListener('pointerdown', onPointer, true);
    root.removeEventListener('focusin', onFocus);
    root.removeEventListener('focusout', onBlur);
  };
}
