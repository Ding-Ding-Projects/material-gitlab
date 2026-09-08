export function applyMobileAccessibility(root = document) {
  root.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"]').forEach((control) => {
    control.classList.add('touch-target');
    if (!control.hasAttribute('tabindex') && control.matches('[role="button"]')) control.tabIndex = 0;
  });
  root.querySelectorAll('[role="tablist"]').forEach((list) => {
    const dock = list.closest('[data-dock]')?.dataset.dock;
    const orientation = dock === 'left' || dock === 'right' ? 'vertical' : 'horizontal';
    list.setAttribute('aria-orientation', orientation);
    const tabs = Array.from(list.querySelectorAll(':scope > [role="tab"]'));
    if (!tabs.length) return;
    const selected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
    tabs.forEach((tab) => { tab.tabIndex = tab === selected ? 0 : -1; });
    if (list.dataset.keyboardTabs === 'true') return;
    list.dataset.keyboardTabs = 'true';
    list.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(event.target.closest?.('[role="tab"]'));
      if (current < 0) return;
      const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      let next = current;
      if (event.key === previousKey) next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === nextKey) next = (current + 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });
  root.querySelectorAll('[data-overflow-container]').forEach((container) => { container.style.overflowX = 'auto'; container.style.maxWidth = '100%'; });
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) root.documentElement?.classList.add('reduce-motion');
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
