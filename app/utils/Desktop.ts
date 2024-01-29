import { isMac, isWindows } from "@shared/utils/browser";

export default class Desktop {
  /**
   * Returns true if the client has inset/floating window controls.
   */
  static hasInsetTitlebar() {
    return this.isMacApp();
  }

  /**
   * Returns true if the client is running in the macOS app.
   */
  static isMacApp() {
    return this.isElectron() && isMac();
  }

  /**
   * Returns true if the client is running in the Windows app.
   */
  static isWindowsApp() {
    return this.isElectron() && isWindows();
  }

  /**
   * Returns true if the client is running in a desktop app.
   */
  static isElectron() {
    return navigator?.userAgent?.includes("Electron");
  }

  /**
   * The bridge provides secure access to API's in desktop wrapper.
   */
  static bridge = window.DesktopBridge;
}
