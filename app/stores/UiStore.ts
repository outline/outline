import { action, autorun, computed, observable } from "mobx";
import { light as defaultTheme } from "@shared/styles/theme";
import Storage from "@shared/utils/Storage";
import Document from "~/models/Document";
import type { ConnectionStatus } from "~/scenes/Document/components/MultiplayerEditor";

const UI_STORE = "UI_STORE";

// Whether the window launched with sidebar force hidden
let sidebarHidden = window.location.search.includes("sidebarHidden=true");

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
  activeCollectionId?: string | null;

  @observable
  observingUserId: string | undefined;

  @observable
  progressBarVisible = false;

  @observable
  tocVisible = false;

  @observable
  mobileSidebarVisible = false;

  @observable
  sidebarWidth: number;

  @observable
  sidebarRightWidth: number;

  @observable
  sidebarCollapsed = false;

  @observable
  commentsExpanded: string[] = [];

  @observable
  sidebarIsResizing = false;

  @observable
  multiplayerStatus: ConnectionStatus;

  constructor() {
    // Rehydrate
    const data: Partial<UiStore> = Storage.get(UI_STORE) || {};

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
    this.sidebarRightWidth =
      data.sidebarRightWidth || defaultTheme.sidebarRightWidth;
    this.tocVisible = !!data.tocVisible;
    this.commentsExpanded = data.commentsExpanded || [];
    this.theme = data.theme || Theme.System;

    autorun(() => {
      Storage.set(UI_STORE, this.asJson);
    });
  }

  @action
  setTheme = (theme: Theme) => {
    this.theme = theme;
    Storage.set("theme", this.theme);
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
  setSidebarWidth = (width: number): void => {
    this.sidebarWidth = width;
  };

  @action
  setRightSidebarWidth = (width: number): void => {
    this.sidebarRightWidth = width;
  };

  @action
  collapseSidebar = () => {
    this.sidebarCollapsed = true;
  };

  @action
  expandSidebar = () => {
    sidebarHidden = false;
    this.sidebarCollapsed = false;
  };

  @action
  collapseComments = (documentId: string) => {
    this.commentsExpanded = this.commentsExpanded.filter(
      (id) => id !== documentId
    );
  };

  @action
  expandComments = (documentId: string) => {
    if (!this.commentsExpanded.includes(documentId)) {
      this.commentsExpanded.push(documentId);
    }
  };

  @action
  toggleComments = (documentId: string) => {
    if (this.commentsExpanded.includes(documentId)) {
      this.collapseComments(documentId);
    } else {
      this.expandComments(documentId);
    }
  };

  @action
  toggleCollapsedSidebar = () => {
    sidebarHidden = false;
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

  /**
   * Returns the current state of the sidebar taking into account user preference
   * and whether the sidebar has been hidden as part of launching in a new
   * desktop window.
   */
  @computed
  get sidebarIsClosed() {
    return this.sidebarCollapsed || sidebarHidden;
  }

  @computed
  get resolvedTheme(): Theme | SystemTheme {
    if (this.theme === "system") {
      return this.systemTheme;
    }

    return this.theme;
  }

  @computed
  get asJson() {
    return {
      tocVisible: this.tocVisible,
      sidebarCollapsed: this.sidebarCollapsed,
      sidebarWidth: this.sidebarWidth,
      sidebarRightWidth: this.sidebarRightWidth,
      languagePromptDismissed: this.languagePromptDismissed,
      commentsExpanded: this.commentsExpanded,
      theme: this.theme,
    };
  }
}

export default UiStore;
