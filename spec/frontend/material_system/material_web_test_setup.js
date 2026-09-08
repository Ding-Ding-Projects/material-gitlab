// jsdom 20 has no ElementInternals implementation. Exercise the real Material
// elements with a test-only standards polyfill, never a substitute component.
// These results are DOM contract tests, not native-browser or visual evidence.
import 'element-internals-polyfill';

// jsdom lacks PointerEvent. This supplies event shape only; no pointer layout,
// animation timing, or visual interaction is claimed by these DOM tests.
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, options = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
      this.pointerType = options.pointerType ?? '';
      this.isPrimary = options.isPrimary ?? false;
    }
  };
}

// DOM-only animation stub. Material's real ripple still owns the animation call;
// jsdom does not paint or implement Web Animations. Browser verification is pending.
if (!Element.prototype.animate) {
  Element.prototype.animate = () => ({
    currentTime: Infinity,
    cancel() {},
    finished: Promise.resolve(),
  });
}
