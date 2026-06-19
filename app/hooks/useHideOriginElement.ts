import { useEffect } from "react";

/**
 * Temporarily hides a DOM element while `enabled` is true, restoring its
 * previous visibility when disabled or unmounted. Useful for shared-element
 * transitions where an origin element should be hidden so it isn't visible
 * behind the animating clone.
 *
 * @param getElement Resolver for the element to hide. Should be stable across
 * renders (e.g. wrapped in `useCallback`) to avoid unnecessary re-runs.
 * @param enabled Whether the element should currently be hidden.
 */
export default function useHideOriginElement(
  getElement: () => Element | null | undefined,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const element = getElement();
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      return;
    }
    const previousVisibility = element.style.visibility;
    element.style.visibility = "hidden";
    return () => {
      element.style.visibility = previousVisibility;
    };
  }, [getElement, enabled]);
}
