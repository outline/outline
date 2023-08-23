import { isTouchDevice } from "@shared/utils/browser";
import Desktop from "~/utils/Desktop";

/**
 * Returns "hover" on a non-touch device and "active" on a touch device. To
 * avoid "sticky" hover on mobile. Use `&:${hover} {...}` instead of
 * using `&:hover {...}`.
 */
export const hover = isTouchDevice() ? "active" : "hover";

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

/**
 * Truncate multiline text.
 *
 * @returns string of CSS
 */
export const truncateMultiline = (lines: number) => `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
  overflow-wrap: anywhere;
`;
