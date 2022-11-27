declare global {
  interface Window {
    DesktopBridge: {
      /**
       * The name of the platform running on.
       */
      platform: string;

      /**
       * The version of the loaded application.
       */
      version: () => Promise<string>;

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
       * Adds a custom host to config
       */
      addCustomHost: (host: string) => Promise<void>;

      /**
       * Set the language used by the spellchecker on Windows/Linux.
       */
      setSpellCheckerLanguages: (languages: string[]) => Promise<void>;

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
    };
  }
}

export {};
