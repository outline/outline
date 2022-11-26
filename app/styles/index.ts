import Desktop from "~/utils/Desktop";
import { isTouchDevice } from "~/utils/browser";

/**
 * Returns "hover" on a non-touch device and "active" on a touch device. To
 * avoid "sticky" hover on mobile. Use `&:${hover} {...}` instead of
 * using `&:hover {...}`.
 */
export const hover = isTouchDevice() ? "active" : "hover";

export const draggableOnDesktop = () =>
  Desktop.isElectron() ? "-webkit-app-region: drag;" : "";

export const undraggableOnDesktop = () =>
  Desktop.isElectron() ? "-webkit-app-region: no-drag;" : "";

export const fadeOnDesktopBackgrounded = () => {
  if (!Desktop.isElectron()) {
    return "";
  }

  return `
    body.backgrounded & { opacity: 0.75; }
  `;
};
