import { action, computed, observable } from "mobx";
import { flushSync } from "react-dom";
import { light as defaultTheme } from "@shared/styles/theme";
import Storage from "@shared/utils/Storage";
import type Model from "~/models/base/Model";
import Collection from "~/models/Collection";
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

  // themeOverride is set when a theme query parameter is detected, persists for the session
  @observable
  themeOverride: Theme | undefined;

  // systemTheme represents the system UI theme (Settings -> General in macOS)
  @observable
  systemTheme: SystemTheme;

  @observable
  activeModels = observable.map<string, Model>();

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

  @observable
  debugSafeArea = false;

  /** Tracks active export toasts for in-place updates when export completes */
  exportToasts = observable.map<
    string,
    { toastId: string; timeoutId: ReturnType<typeof setTimeout> }
  >();

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

  /**
   * Add a model instance to the active set.
   *
   * @param model the model instance to add.
   */
  @action
  addActiveModel = (model: Model): void => {
    this.activeModels.set(model.id, model);
  };

  /**
   * Remove a model instance from the active set.
   *
   * @param model the model instance to remove.
   */
  @action
  removeActiveModel = (model: Model): void => {
    this.activeModels.delete(model.id);
  };

  /**
   * Get all active models of a specific type.
   *
   * @param modelClass the model class to filter by.
   * @returns array of active models of the specified type.
   */
  getActiveModels<T extends Model>(modelClass: new (...args: any[]) => T): T[] {
    return Array.from(this.activeModels.values()).filter(
      (model) => model.constructor === modelClass
    ) as T[];
  }

  /**
   * Check if a model instance is in the active set.
   *
   * @param model the model instance to check.
   * @returns true if the model is active.
   */
  isModelActive(model: Model): boolean {
    return this.activeModels.has(model.id);
  }

  /**
   * Clear all active models, or only models of a specific type.
   *
   * @param modelClass optional model class to filter by.
   */
  @action
  clearActiveModels(modelClass?: new (...args: any[]) => Model): void {
    if (modelClass) {
      const modelsToRemove = this.getActiveModels(modelClass);
      modelsToRemove.forEach((model) => this.activeModels.delete(model.id));
    } else {
      this.activeModels.clear();
    }
  }

  /**
   * Get the most recently added model of a specific type (primary).
   *
   * @param modelClass the model class to filter by.
   * @returns the most recently added model of the specified type.
   */
  getPrimaryActiveModel<T extends Model>(
    modelClass: new (...args: any[]) => T
  ): T | undefined {
    const models = this.getActiveModels<T>(modelClass);
    return models[models.length - 1];
  }

  @computed
  get activeDocumentId(): string | undefined {
    return this.getPrimaryActiveModel<Document>(Document)?.id;
  }

  @computed
  get activeCollectionId(): string | undefined {
    return this.getPrimaryActiveModel<Collection>(Collection)?.id;
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

  /**
   * Set a theme override from a query parameter. This persists for the session
   * but is not saved to localStorage.
   *
   * @param theme The theme to override with, or undefined to clear.
   */
  @action
  setThemeOverride = (theme: Theme | undefined) => {
    this.themeOverride = theme;
  };

  @action
  setActiveDocument = (document: Document | string): void => {
    let model: Document | undefined;

    if (typeof document === "string") {
      model = this.rootStore.documents.get(document);
    } else {
      model = document;
    }

    if (!model) {
      return;
    }

    this.clearActiveModels(Document);
    this.addActiveModel(model);
    this.observingUserId = undefined;

    if (model.isActive && model.collectionId) {
      const collection = this.rootStore.collections.get(model.collectionId);
      if (collection) {
        this.clearActiveModels(Collection);
        this.addActiveModel(collection);
      }
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
    if (collectionId === undefined || collectionId === null) {
      this.clearActiveModels(Collection);
      return;
    }

    const model = this.rootStore.collections.get(collectionId);
    if (model) {
      this.clearActiveModels(Collection);
      this.addActiveModel(model);
    }
  };

  @action
  setObservingUser = (userId: string | undefined): void => {
    this.observingUserId = userId;
  };

  @action
  clearActiveDocument = (): void => {
    this.clearActiveModels(Document);
    this.observingUserId = undefined;

    // Unset when navigating away from a document (e.g. to another document, home, settings, etc.)
    // Next document's onMount will set the right activeCollectionId.
    this.clearActiveModels(Collection);
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

  @action
  toggleDebugSafeArea = () => {
    this.debugSafeArea = !this.debugSafeArea;
  };

  @action
  registerExportToast = (
    fileOperationId: string,
    toastId: string,
    timeoutId: ReturnType<typeof setTimeout>
  ) => {
    this.exportToasts.set(fileOperationId, { toastId, timeoutId });
  };

  @action
  removeExportToast = (fileOperationId: string) => {
    const tracked = this.exportToasts.get(fileOperationId);
    if (tracked) {
      clearTimeout(tracked.timeoutId);
      this.exportToasts.delete(fileOperationId);
    }
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
    if (this.themeOverride) {
      return this.themeOverride;
    }

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
