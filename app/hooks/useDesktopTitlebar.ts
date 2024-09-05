import * as React from "react";
import Desktop from "~/utils/Desktop";

export const useDesktopTitlebar = () => {
  React.useEffect(() => {
    if (!Desktop.bridge) {
      return;
    }

    const handleDoubleClick = async (event: MouseEvent) => {
      // Ignore double clicks on interactive elements such as inputs and buttons
      if (event.composedPath().some(elementIsInteractive)) {
        return;
      }

      // Ignore if the mouse position is further down than the header height
      if (event.clientY > 64) {
        return;
      }

      event.preventDefault();
      await Desktop.bridge?.onTitlebarDoubleClick();
    };

    window.addEventListener("dblclick", handleDoubleClick);
    return () => window.removeEventListener("dblclick", handleDoubleClick);
  }, []);
};

/**
 * Check if an element is user interactive.
 *
 * @param target HTML element
 * @returns boolean
 */
function elementIsInteractive(target: EventTarget) {
  return (
    target &&
    target instanceof HTMLElement &&
    (target instanceof HTMLSelectElement ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLButtonElement ||
      target.getAttribute("role") === "button" ||
      target.getAttribute("role") === "textarea")
  );
}
