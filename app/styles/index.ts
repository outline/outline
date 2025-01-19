import Desktop from "~/utils/Desktop";

/**
 * Mixin to make an element drag the window when rendered in the desktop app.
 *
 * @returns string of CSS
 */
export const draggableOnDesktop = () =>
  Desktop.isElectron() ? "-webkit-app-region: drag;" : "";

/**
 * Mixin to make an element not drag the window when rendered in the desktop app.
 *
 * @returns string of CSS
 */
export const undraggableOnDesktop = () =>
  Desktop.isElectron() ? "-webkit-app-region: no-drag;" : "";

/**
 * Mixin to make an element fade when the desktop app is backgrounded.
 *
 * @returns string of CSS
 */
export const fadeOnDesktopBackgrounded = () => {
  if (!Desktop.isElectron()) {
    return "";
  }

  return `
    body.backgrounded & { opacity: 0.75; }
  `;
};
