// @flow
import { action, autorun, computed, observable } from "mobx";
import { light as defaultTheme } from "shared/theme";
import Collection from "models/Collection";
import Document from "models/Document";

const UI_STORE = "UI_STORE";

type Status = "connecting" | "connected" | "disconnected" | void;

class UiStore {
  // has the user seen the prompt to change the UI language and actioned it
  @observable languagePromptDismissed: boolean;

  // theme represents the users UI preference (defaults to system)
  @observable theme: "light" | "dark" | "system";

  // systemTheme represents the system UI theme (Settings -> General in macOS)
  @observable systemTheme: "light" | "dark";
  @observable activeDocumentId: ?string;
  @observable activeCollectionId: ?string;
  @observable progressBarVisible: boolean = false;
  @observable isEditing: boolean = false;
  @observable tocVisible: boolean = false;
  @observable mobileSidebarVisible: boolean = false;
  @observable sidebarWidth: number;
  @observable sidebarCollapsed: boolean = false;
  @observable sidebarIsResizing: boolean = false;
  @observable multiplayerStatus: Status;

  constructor() {
    // Rehydrate
    let data = {};
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

      const setSystemTheme = (event) => {
        this.systemTheme = event.matches ? "dark" : "light";
      };
      setSystemTheme(colorSchemeQueryList);
      if (colorSchemeQueryList.addListener) {
        colorSchemeQueryList.addListener(setSystemTheme);
      }
    }

    // persisted keys
    this.languagePromptDismissed = data.languagePromptDismissed;
    this.sidebarCollapsed = data.sidebarCollapsed;
    this.sidebarWidth = data.sidebarWidth || defaultTheme.sidebarWidth;
    this.tocVisible = data.tocVisible;
    this.theme = data.theme || "system";

    autorun(() => {
      try {
        localStorage.setItem(UI_STORE, this.asJson);
      } catch (_) {
        // no-op Safari private mode
      }
    });
  }

  @action
  setTheme = (theme: "light" | "dark" | "system") => {
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
  setActiveDocument = (document: Document): void => {
    this.activeDocumentId = document.id;

    if (
      document.publishedAt &&
      !document.isArchived &&
      !document.isDeleted &&
      !document.isTemplate
    ) {
      this.activeCollectionId = document.collectionId;
    }
  };

  @action
  setMultiplayerStatus = (status: Status): void => {
    this.multiplayerStatus = status;
  };

  @action
  setSidebarResizing = (sidebarIsResizing: boolean): void => {
    this.sidebarIsResizing = sidebarIsResizing;
  };

  @action
  setActiveCollection = (collection: Collection): void => {
    this.activeCollectionId = collection.id;
  };

  @action
  clearActiveDocument = (): void => {
    this.activeDocumentId = undefined;
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
  hideMobileSidebar = () => {
    this.mobileSidebarVisible = false;
  };

  @computed
  get resolvedTheme(): "dark" | "light" {
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
