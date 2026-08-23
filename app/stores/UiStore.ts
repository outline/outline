import { clamp } from "es-toolkit";
import { action, computed, observable } from "mobx";
import { flushSync } from "react-dom";
import { light as defaultTheme } from "@shared/styles/theme";
import type { ProsemirrorData } from "@shared/types";
import Storage from "@shared/utils/Storage";
import Note from "~/models/Note";
import type Model from "~/models/base/Model";
import Notebook from "~/models/Notebook";
import type { ConnectionStatus } from "~/scenes/Note/components/MultiplayerEditor";
import type { SplitViewPane } from "~/utils/splitView";
import { isTruthyQueryValue } from "~/utils/urls";
import { startViewTransition } from "~/utils/viewTransition";
import type RootStore from "./RootStore";
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
export type ResolvedTheme = "light" | "dark" | "system";
/** The panels that can be displayed in the right sidebar. */
export type RightSidebarPanel = "comments" | "history";
type PersistedData = Pick<
  UiStore,
  | "languagePromptDismissed"
  | "rightSidebar"
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
  // Whether the sidebar is hidden entirely, e.g. when embedding a note via
  // the ?sidebarHidden=1 query parameter. Not persisted across reloads.
  @observable
  sidebarHidden = isTruthyQueryValue(
    new URLSearchParams(window.location.search).get("sidebarHidden")
  );
  @observable
  rightSidebar: RightSidebarPanel | null = null;
  // The right sidebar panel displayed in the secondary split view pane. Not
  // persisted as the pane itself only exists for the current session.
  @observable
  secondaryRightSidebar: RightSidebarPanel | null = null;
  // The fraction of the split view's width occupied by the primary pane. Not
  // persisted, reset when the split view closes.
  @observable
  splitViewRatio = 0.5;
  @observable
  sidebarIsResizing = false;
  @observable
  multiplayerStatus: ConnectionStatus;
  @observable
  multiplayerErrorCode?: number;
  @observable
  debugSafeArea = false;
  /** Data for the currently active presentation, if any. */
  @observable
  presentationData: {
    title: string;
    icon?: string | null;
    color?: string | null;
    data: ProsemirrorData;
  } | null = null;
  /**
   * Enter presentation mode for the given note.
   *
   * @param note the note to present, or null to exit.
   */
  @action
  setPresentingNote = (note: Note | null): void => {
    this.presentationData = note
      ? {
          title: note.titleWithDefault,
          icon: note.icon,
          color: note.color,
          data: note.data,
        }
      : null;
  };
  /** Tracks active export toasts for in-place updates when export completes */
  exportToasts = observable.map<
    string,
    {
      toastId: string;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  >();
  rootStore: RootStore;
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    // Rehydrate
    const data: PersistedData = Storage.get(UI_STORE) || {};
    this.languagePromptDismissed = data.languagePromptDismissed;
    this.sidebarCollapsed = !!data.sidebarCollapsed;
    // Widths are clamped as a drag may have been interrupted while stretched beyond the bounds,
    // or the bounds themselves may have since changed.
    const { sidebarResizeMinWidth: minWidth, sidebarMaxWidth: maxWidth } =
      defaultTheme;
    this.sidebarWidth = clamp(
      data.sidebarWidth || defaultTheme.sidebarWidth,
      minWidth,
      maxWidth
    );
    this.sidebarRightWidth = clamp(
      data.sidebarRightWidth || defaultTheme.sidebarRightWidth,
      minWidth,
      maxWidth
    );
    this.tocVisible = data.tocVisible;
    this.rightSidebar = data.rightSidebar ?? null;
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
      if (typeof colorSchemeQueryList.addEventListener === "function") {
        colorSchemeQueryList.addEventListener("change", setSystemTheme);
      } else if (typeof colorSchemeQueryList.addListener === "function") {
        colorSchemeQueryList.addListener(setSystemTheme);
      }
    }
    window.addEventListener("storage", (event) => {
      if (event.key === UI_STORE && event.newValue) {
        let newData: PersistedData | null;
        try {
          newData = JSON.parse(event.newValue);
        } catch {
          return;
        }
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
  getActiveModels<T extends Model>(
    modelClass: new (...args: never[]) => T
  ): T[] {
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
  clearActiveModels(modelClass?: new (...args: never[]) => Model): void {
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
    modelClass: new (...args: never[]) => T
  ): T | undefined {
    const models = this.getActiveModels<T>(modelClass);
    return models[models.length - 1];
  }
  @computed
  get activeNoteId(): string | undefined {
    return this.getPrimaryActiveModel<Note>(Note)?.id;
  }
  @computed
  get activeNotebookId(): string | undefined {
    // Derive from the active note so it resolves even if the collection
    // loads after the note became active.
    const activeNote = this.getPrimaryActiveModel<Note>(Note);
    if (activeNote?.isActive && activeNote.notebookId) {
      return activeNote.notebookId;
    }
    return this.getPrimaryActiveModel<Notebook>(Notebook)?.id;
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
  setActiveNote = (note: Note | string): void => {
    let model: Note | undefined;
    if (typeof note === "string") {
      model = this.rootStore.notes.get(note);
    } else {
      model = note;
    }
    if (!model) {
      return;
    }
    this.clearActiveModels(Note);
    this.addActiveModel(model);
    this.observingUserId = undefined;
    if (model.isActive && model.notebookId) {
      const notebook = this.rootStore.notebooks.get(model.notebookId);
      if (notebook) {
        this.clearActiveModels(Notebook);
        this.addActiveModel(notebook);
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
  /**
   * Sets the fraction of the split view's width occupied by the primary pane,
   * clamped so that neither pane becomes unusably narrow.
   *
   * @param ratio the fraction of the split view's width for the primary pane.
   */
  @action
  setSplitViewRatio = (ratio: number): void => {
    this.splitViewRatio = Math.min(0.8, Math.max(0.2, ratio));
  };
  /**
   * Returns the right sidebar panel displayed in the given split view pane.
   *
   * @param pane the split view pane, defaults to the primary pane.
   * @returns the panel displayed in the pane, or null when closed.
   */
  getRightSidebar = (
    pane: SplitViewPane = "primary"
  ): RightSidebarPanel | null =>
    pane === "secondary" ? this.secondaryRightSidebar : this.rightSidebar;
  /**
   * Sets the right sidebar panel displayed in the given split view pane.
   *
   * @param panel the panel to display, or null to close the sidebar.
   * @param pane the split view pane, defaults to the primary pane.
   */
  @action
  setRightSidebar = (
    panel: RightSidebarPanel | null,
    pane: SplitViewPane = "primary"
  ): void => {
    if (pane === "secondary") {
      this.secondaryRightSidebar = panel;
    } else {
      this.rightSidebar = panel;
    }
  };
  @action
  setActiveNotebook = (notebookId: string | undefined): void => {
    if (notebookId === undefined || notebookId === null) {
      this.clearActiveModels(Notebook);
      return;
    }
    const model = this.rootStore.notebooks.get(notebookId);
    if (model) {
      this.clearActiveModels(Notebook);
      this.addActiveModel(model);
    }
  };
  @action
  setObservingUser = (userId: string | undefined): void => {
    this.observingUserId = userId;
  };
  @action
  clearActiveNote = (): void => {
    this.clearActiveModels(Note);
    this.observingUserId = undefined;
    // Unset when navigating away from a note (e.g. to another note, home, settings, etc.)
    // Next note's onMount will set the right activeNotebookId.
    this.clearActiveModels(Notebook);
  };
  @action
  collapseSidebar = () => {
    this.set({ sidebarCollapsed: true });
  };
  @action
  expandSidebar = () => {
    this.sidebarHidden = false;
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
  toggleCollapsedSidebar = () => {
    this.sidebarHidden = false;
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
      (this.rootStore.notebooks.isLoaded &&
        this.rootStore.stars.isLoaded &&
        this.rootStore.userMemberships.isLoaded)
    );
  }
  /**
   * Returns the current state of the sidebar taking into account user preference
   * and whether the sidebar has been hidden as part of launching in a new
   * desktop window.
   */
  @computed
  get sidebarIsClosed() {
    return this.sidebarCollapsed || this.sidebarHidden;
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
      rightSidebar: this.rightSidebar,
      theme: this.theme,
    };
  }
  private persist = () => {
    Storage.set(UI_STORE, this.asJson);
  };
}
export default UiStore;
