/**
 * Returns the element an event was dispatched to. When the target is a text
 * node, as can happen in Firefox, its parent element is returned instead so
 * that element methods such as `closest` can be used safely.
 *
 * @param event the DOM event.
 * @returns the target element, or null if the target is not in an element.
 */
export function getEventTargetElement(event: Event): Element | null {
  const { target } = event;
  if (typeof Node === "undefined" || !(target instanceof Node)) {
    return null;
  }
  if (target instanceof Element) {
    return target;
  }
  return target.parentElement;
}
