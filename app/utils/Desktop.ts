import { isMac, isWindows } from "@shared/utils/browser";
import env from "~/env";

/**
 * Helper methods for detecting and interacting with the desktop application
 * wrapper.
 */
export default class Desktop {
  /**
   * The custom protocol scheme registered by the desktop application.
   */
  static protocol = env.isDevelopment ? "outline-dev" : "outline";

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
    return this.isElectron() && isMac;
  }

  /**
   * Returns true if the client is running in the Windows app.
   */
  static isWindowsApp() {
    return this.isElectron() && isWindows;
  }

  /**
   * Returns true if the client is running in the Outline desktop app. Other
   * Electron based browsers also include "Electron" in the user agent, so the
   * app name token is required too.
   *
   * @returns true if the client is the Outline desktop app.
   */
  static isElectron() {
    const userAgent = navigator?.userAgent ?? "";
    return userAgent.includes("Electron/") && userAgent.includes("Outline/");
  }

  /**
   * Returns true when the desktop app can run the WebAuthn ceremony itself. This
   * requires a desktop app that has configured a platform authenticator, and a
   * device that supports it.
   *
   * @returns a promise that resolves to true if passkeys work inside the app.
   */
  static async isPasskeySupported(): Promise<boolean> {
    try {
      if (!(await this.bridge?.isPasskeySupported?.())) {
        return false;
      }
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (_err) {
      return false;
    }
  }

  /**
   * The bridge provides secure access to API's in desktop wrapper.
   */
  static bridge = window.DesktopBridge;
}
