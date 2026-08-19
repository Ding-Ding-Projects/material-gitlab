/**
 * Minimal focus trap for anchored overlays (drawer, popover, palette). Framework-neutral
 * so any of this surface's overlay components can reuse the same Tab-cycling behavior.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Traps Tab/Shift+Tab focus inside `container`. Returns a cleanup function that
 * removes the listener; call it on close before restoring focus to the trigger.
 */
export function trapFocus(container, { initialFocus } = {}) {
  if (!container) return () => {};
  const previouslyFocused = document.activeElement;
  const focusTarget = (initialFocus && container.querySelector(initialFocus)) || focusableElements(container)[0];
  if (focusTarget) focusTarget.focus();

  const onKeydown = (event) => {
    if (event.key !== 'Tab') return;
    const elements = focusableElements(container);
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', onKeydown);

  return function releaseFocusTrap({ restoreFocus = true } = {}) {
    container.removeEventListener('keydown', onKeydown);
    if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  };
}

export default trapFocus;
