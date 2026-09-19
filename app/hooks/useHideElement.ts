import { useLayoutEffect } from "react";

/**
 * Temporarily hides a DOM element while `enabled` is true, restoring its
 * previous visibility when disabled or unmounted. Useful for shared-element
 * transitions where an element should be hidden so it isn't visible behind the
 * animating clone.
 *
 * @param element The element to hide.
 * @param enabled Whether the element should currently be hidden.
 */
export default function useHideElement(
  element: Element | null | undefined,
  enabled: boolean
) {
  useLayoutEffect(() => {
    if (
      !enabled ||
      (!(element instanceof HTMLElement) && !(element instanceof SVGElement))
    ) {
      return;
    }
    const previousVisibility = element.style.visibility;
    element.style.visibility = "hidden";
    return () => {
      element.style.visibility = previousVisibility;
    };
  }, [element, enabled]);
}
