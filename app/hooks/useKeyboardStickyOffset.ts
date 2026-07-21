import * as React from "react";
import { getSafeAreaInsets } from "@shared/utils/browser";

/**
 * Pins a `position: fixed; bottom: 0` element directly above the on-screen
 * keyboard on mobile browsers.
 *
 * On iOS Safari the layout viewport (which fixed elements are positioned
 * against) does not shrink when the software keyboard opens — only the visual
 * viewport does. As a result an element anchored to the bottom of the screen
 * ends up hidden behind the keyboard. This hook measures the gap between the
 * bottom of the layout viewport and the bottom of the visual viewport and
 * translates the element upwards by that amount so it always rests on top of
 * the keyboard.
 *
 * The transform is re-applied after every render (so a parent re-render cannot
 * clobber it) and on visual viewport `resize`/`scroll` events. A short-lived
 * `requestAnimationFrame` loop tracks the keyboard's open/close animation so
 * the element glides with it rather than snapping into place once the
 * transition settles. Writes go directly to the node's style to avoid React
 * re-render latency during the animation.
 *
 * @param ref A ref to the fixed-position element to keep pinned.
 * @param enabled Whether the behavior should be active.
 */
export default function useKeyboardStickyOffset(
  ref: React.RefObject<HTMLElement>,
  enabled: boolean
) {
  const apply = React.useCallback(() => {
    const viewport = window.visualViewport;
    const node = ref.current;
    if (!enabled || !viewport || !node) {
      return;
    }

    // Distance from the bottom of the layout viewport (where the element is
    // anchored) up to the bottom of the visible area — i.e. the height of the
    // keyboard, if any. On browsers that resize the layout viewport with the
    // keyboard this is ~0 and we fall back to the safe area inset so the bar
    // clears the home indicator.
    const keyboardInset = Math.max(
      0,
      window.innerHeight - (viewport.offsetTop + viewport.height)
    );
    const offset = Math.round(
      Math.max(keyboardInset, getSafeAreaInsets().bottom)
    );

    node.style.transform = `translate3d(0, ${-offset}px, 0)`;
  }, [ref, enabled]);

  // Re-apply after every render, before paint, so the keyboard-aware transform
  // survives parent re-renders and there is no flash on first mount.
  React.useLayoutEffect(apply);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      return;
    }

    let frame = 0;
    let trackUntil = 0;

    const tick = (now: number) => {
      apply();
      frame = now < trackUntil ? requestAnimationFrame(tick) : 0;
    };

    const schedule = () => {
      // Keep re-measuring for a short window so the element follows the
      // keyboard animation rather than jumping once it settles.
      trackUntil = performance.now() + 350;
      if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    };

    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    window.addEventListener("focusin", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("focusin", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [enabled, apply]);
}
