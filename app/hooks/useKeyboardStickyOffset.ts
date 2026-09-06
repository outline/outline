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
 * The measurement is repeated every frame while enabled. A keyboard changes
 * height without warning – a predictive text strip or an accessory bar comes
 * and goes, one keyboard type replaces another – and not every change is
 * announced by a viewport event, so an element positioned once from an event
 * can be left behind the keyboard. Writes go straight to the node's style, and
 * only when the offset changes, so a frame that measures the same keyboard
 * costs a handful of property reads.
 *
 * @param ref A ref to the fixed-position element to keep pinned.
 * @param enabled Whether the behavior should be active.
 */
export default function useKeyboardStickyOffset(
  ref: React.RefObject<HTMLElement>,
  enabled: boolean
) {
  const applied = React.useRef<number | null>(null);

  // Reading the layout viewport height can force a layout, so it is measured
  // when it changes rather than on every frame.
  const safeAreaBottom = React.useRef(0);
  const layoutHeight = React.useRef(0);

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
      layoutHeight.current - (viewport.offsetTop + viewport.height)
    );
    const offset = Math.round(Math.max(keyboardInset, safeAreaBottom.current));

    if (offset !== applied.current) {
      applied.current = offset;
      node.style.transform = `translate3d(0, ${-offset}px, 0)`;
    }
  }, [ref, enabled]);

  // Re-apply after every render, before paint, so the transform survives a
  // parent re-render and there is no flash on first mount.
  React.useLayoutEffect(() => {
    safeAreaBottom.current = getSafeAreaInsets().bottom;
    layoutHeight.current = window.innerHeight;
    applied.current = null;
    apply();
  });

  React.useEffect(() => {
    if (!enabled || !window.visualViewport) {
      return;
    }

    const handleResize = () => {
      layoutHeight.current = window.innerHeight;
      safeAreaBottom.current = getSafeAreaInsets().bottom;
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    let frame = requestAnimationFrame(function tick() {
      apply();
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [enabled, apply]);
}
