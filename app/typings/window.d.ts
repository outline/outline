import type RootStore from "~/stores/RootStore";

declare global {
  interface ImportMeta {
    /**
     * A special feature that allows you to get all matching modules starting from some base directory.
     */
    glob: (pattern: string, option?: { eager: boolean }) => any;
  }

  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;

    stores: RootStore;

    DesktopBridge?: {
      /**
       * The name of the platform running on.
       */
      platform: string;

      /**
       * The version of the loaded application.
       */
      version: () => string;

      /**
       * Restarts the application.
       */
      restart: () => Promise<void>;

      /**
       * Restarts the application and installs the update.
       */
      restartAndInstall: () => Promise<void>;

      /**
       * Tells the updater to check for updates now.
       */
      checkForUpdates: () => Promise<void>;

      /**
       * Passes double click events from titlebar area
       */
      onTitlebarDoubleClick: () => Promise<void>;

      /**
       * Passes log out events from the app to the main process
       */
      onLogout: () => Promise<void>;

      /**
       * Adds a custom host to config
       */
      addCustomHost: (host: string) => Promise<void>;

      /**
       * Set the language used by the spellchecker on Windows/Linux.
       */
      setSpellCheckerLanguages: (languages: string[]) => Promise<void>;

      /**
       * Set the badge on the app icon.
       */
      setNotificationCount: (count: number) => Promise<void>;

      /**
       * Registers a callback to be called when the window is focused.
       */
      focus: (callback: () => void) => void;

      /**
       * Registers a callback to be called when the window loses focus.
       */
      blur: (callback: () => void) => void;

      /**
       * Registers a callback to be called when a route change is requested from the main process.
       * This would usually be when it is responding to a deeplink.
       */
      redirect: (callback: (path: string, replace: boolean) => void) => void;

      /**
       * Registers a callback to be called when the application is ready to update.
       */
      updateDownloaded: (callback: () => void) => void;

      /**
       * Registers a callback to be called when the application wants to open keyboard shortcuts.
       */
      openKeyboardShortcuts: (callback: () => void) => void;

      /**
       * Go back in history, if possible
       */
      goBack: () => void;

      /**
       * Go forward in history, if possible
       */
      goForward: () => void;

      /**
       * Registers a callback to be called when the application wants to open the find in page dialog.
       */
      onFindInPage: (callback: () => void) => void;

      /**
       * Registers a callback to be called when the application wants to open the replace in page dialog.
       */
      onReplaceInPage: (callback: () => void) => void;
    };
  }
}

export {};
