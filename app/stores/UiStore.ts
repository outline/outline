import { action, computed, observable } from "mobx";
import { flushSync } from "react-dom";
import { light as defaultTheme } from "@shared/styles/theme";
import Storage from "@shared/utils/Storage";
import Document from "~/models/Document";
import type { ConnectionStatus } from "~/scenes/Document/components/MultiplayerEditor";
import { startViewTransition } from "~/utils/viewTransition";
import type RootStore from "./RootStore";

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

type PersistedData = Pick<
  UiStore,
  | "languagePromptDismissed"
  | "commentsExpanded"
  | "theme"
  | "sidebarWidth"
  | "sidebarRightWidth"
  | "sidebarCollapsed"
  | "tocVisible"
>;

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
  tocVisible: boolean | undefined;

  @observable
  mobileSidebarVisible = false;

  @observable
  sidebarWidth: number;

  @observable
  sidebarRightWidth: number;

  @observable
  sidebarCollapsed = false;

  @observable
  commentsExpanded = false;

  @observable
  sidebarIsResizing = false;

  @observable
  multiplayerStatus: ConnectionStatus;

  @observable
  multiplayerErrorCode?: number;

  rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    // Rehydrate
    const data: PersistedData = Storage.get(UI_STORE) || {};
    this.languagePromptDismissed = data.languagePromptDismissed;
    this.sidebarCollapsed = !!data.sidebarCollapsed;
    this.sidebarWidth = data.sidebarWidth || defaultTheme.sidebarWidth;
    this.sidebarRightWidth =
      data.sidebarRightWidth || defaultTheme.sidebarRightWidth;
    this.tocVisible = data.tocVisible;
    this.commentsExpanded = !!data.commentsExpanded;
    this.theme = data.theme || Theme.System;

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

    window.addEventListener("storage", (event) => {
      if (event.key === UI_STORE && event.newValue) {
        const newData: PersistedData | null = JSON.parse(event.newValue);

        // data may be null if key is deleted in localStorage
        if (!newData) {
          return;
        }

        // Note: we do not sync all properties here, sidebar widths cause fighting between windows
        this.theme = newData.theme;
        this.languagePromptDismissed = newData.languagePromptDismissed;
        this.sidebarCollapsed = !!newData.sidebarCollapsed;
        this.tocVisible = newData.tocVisible;
      }
    });
  }

  @action
  setTheme = (theme: Theme) => {
    startViewTransition(() => {
      flushSync(() => {
        this.theme = theme;
        this.persist();
      });
    });
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
  setMultiplayerStatus = (
    status: ConnectionStatus,
    errorCode?: number
  ): void => {
    this.multiplayerStatus = status;
    this.multiplayerErrorCode = errorCode;
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

    // Unset when navigating away from a document (e.g. to another document, home, settings, etc.)
    // Next document's onMount will set the right activeCollectionId.
    this.activeCollectionId = undefined;
  };

  @action
  collapseSidebar = () => {
    this.set({ sidebarCollapsed: true });
  };

  @action
  expandSidebar = () => {
    sidebarHidden = false;
    this.set({ sidebarCollapsed: false });
  };

  @action
  set = (data: Partial<PersistedData>) => {
    for (const key in data) {
      // @ts-expect-error doesn't understand PersistedData is subset of keys
      this[key] = data[key];
    }
    this.persist();
  };

  @action
  toggleComments = () => {
    this.set({ commentsExpanded: !this.commentsExpanded });
  };

  @action
  toggleCollapsedSidebar = () => {
    sidebarHidden = false;
    this.set({ sidebarCollapsed: !this.sidebarCollapsed });
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
  get readyToShow() {
    return (
      !this.rootStore.auth.user ||
      (this.rootStore.collections.isLoaded && this.rootStore.documents.isLoaded)
    );
  }

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
  get asJson(): PersistedData {
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

  private persist = () => {
    Storage.set(UI_STORE, this.asJson);
  };
}

export default UiStore;
