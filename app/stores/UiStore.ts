import { action, autorun, computed, observable } from "mobx";
import { light as defaultTheme } from "@shared/styles/theme";
import Document from "~/models/Document";
import { ConnectionStatus } from "~/scenes/Document/components/MultiplayerEditor";

const UI_STORE = "UI_STORE";

export enum Theme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

export enum SystemTheme {
  Light = "light",
  Dark = "dark",
}

class UiStore {
  // has the user seen the prompt to change the UI language and actioned it
  @observable
  languagePromptDismissed: boolean | undefined;

  // theme represents the users UI preference (defaults to system)
  @observable
  theme: Theme;

  // systemTheme represents the system UI theme (Settings -> General in macOS)
  @observable
  systemTheme: SystemTheme;

  @observable
  activeDocumentId: string | undefined;

  @observable
  activeCollectionId: string | undefined;

  @observable
  observingUserId: string | undefined;

  @observable
  commandBarOpenedFromSidebar = false;

  @observable
  progressBarVisible = false;

  @observable
  isEditing = false;

  @observable
  tocVisible = false;

  @observable
  mobileSidebarVisible = false;

  @observable
  sidebarWidth: number;

  @observable
  sidebarCollapsed = false;

  @observable
  sidebarIsResizing = false;

  @observable
  multiplayerStatus: ConnectionStatus;

  constructor() {
    // Rehydrate
    let data: Partial<UiStore> = {};

    try {
      data = JSON.parse(localStorage.getItem(UI_STORE) || "{}");
    } catch (_) {
      // no-op Safari private mode
    }

    // system theme listeners
    if (window.matchMedia) {
      const colorSchemeQueryList = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      const setSystemTheme = (event: MediaQueryListEvent | MediaQueryList) => {
        this.systemTheme = event.matches ? SystemTheme.Dark : SystemTheme.Light;
      };

      setSystemTheme(colorSchemeQueryList);

      if (colorSchemeQueryList.addListener) {
        colorSchemeQueryList.addListener(setSystemTheme);
      }
    }

    // persisted keys
    this.languagePromptDismissed = data.languagePromptDismissed;
    this.sidebarCollapsed = !!data.sidebarCollapsed;
    this.sidebarWidth = data.sidebarWidth || defaultTheme.sidebarWidth;
    this.tocVisible = !!data.tocVisible;
    this.theme = data.theme || Theme.System;

    autorun(() => {
      try {
        localStorage.setItem(UI_STORE, this.asJson);
      } catch (_) {
        // no-op Safari private mode
      }
    });
  }

  @action
  setTheme = (theme: Theme) => {
    this.theme = theme;

    if (window.localStorage) {
      window.localStorage.setItem("theme", this.theme);
    }
  };

  @action
  setLanguagePromptDismissed = () => {
    this.languagePromptDismissed = true;
  };

  @action
  setActiveDocument = (document: Document | string): void => {
    if (typeof document === "string") {
      this.activeDocumentId = document;
      this.observingUserId = undefined;
      return;
    }

    this.activeDocumentId = document.id;
    this.observingUserId = undefined;

    if (document.isActive) {
      this.activeCollectionId = document.collectionId;
    }
  };

  @action
  setMultiplayerStatus = (status: ConnectionStatus): void => {
    this.multiplayerStatus = status;
  };

  @action
  setSidebarResizing = (sidebarIsResizing: boolean): void => {
    this.sidebarIsResizing = sidebarIsResizing;
  };

  @action
  setActiveCollection = (collectionId: string | undefined): void => {
    this.activeCollectionId = collectionId;
  };

  @action
  setObservingUser = (userId: string | undefined): void => {
    this.observingUserId = userId;
  };

  @action
  clearActiveDocument = (): void => {
    this.activeDocumentId = undefined;
    this.observingUserId = undefined;
  };

  @action
  setSidebarWidth = (sidebarWidth: number): void => {
    this.sidebarWidth = sidebarWidth;
  };

  @action
  collapseSidebar = () => {
    this.sidebarCollapsed = true;
  };

  @action
  expandSidebar = () => {
    this.sidebarCollapsed = false;
  };

  @action
  toggleCollapsedSidebar = () => {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  };

  @action
  showTableOfContents = () => {
    this.tocVisible = true;
  };

  @action
  hideTableOfContents = () => {
    this.tocVisible = false;
  };

  @action
  enableEditMode = () => {
    this.isEditing = true;
  };

  @action
  disableEditMode = () => {
    this.isEditing = false;
  };

  @action
  enableProgressBar = () => {
    this.progressBarVisible = true;
  };

  @action
  disableProgressBar = () => {
    this.progressBarVisible = false;
  };

  @action
  toggleMobileSidebar = () => {
    this.mobileSidebarVisible = !this.mobileSidebarVisible;
  };

  @action
  commandBarOpened = () => {
    this.commandBarOpenedFromSidebar = true;
  };

  @action
  commandBarClosed = () => {
    this.commandBarOpenedFromSidebar = false;
  };

  @action
  hideMobileSidebar = () => {
    this.mobileSidebarVisible = false;
  };

  @computed
  get resolvedTheme(): Theme | SystemTheme {
    if (this.theme === "system") {
      return this.systemTheme;
    }

    return this.theme;
  }

  @computed
  get asJson(): string {
    return JSON.stringify({
      tocVisible: this.tocVisible,
      sidebarCollapsed: this.sidebarCollapsed,
      sidebarWidth: this.sidebarWidth,
      languagePromptDismissed: this.languagePromptDismissed,
      theme: this.theme,
    });
  }
}

export default UiStore;
