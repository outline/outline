// @flow
import { orderBy } from "lodash";
import { observable, action, autorun, computed } from "mobx";
import { v4 } from "uuid";
import Collection from "models/Collection";
import Document from "models/Document";
import type { Toast } from "types";

const UI_STORE = "UI_STORE";

class UiStore {
  // theme represents the users UI preference (defaults to system)
  @observable theme: "light" | "dark" | "system";

  // systemTheme represents the system UI theme (Settings -> General in macOS)
  @observable systemTheme: "light" | "dark";
  @observable activeDocumentId: ?string;
  @observable activeCollectionId: ?string;
  @observable progressBarVisible: boolean = false;
  @observable editMode: boolean = false;
  @observable tocVisible: boolean = false;
  @observable mobileSidebarVisible: boolean = false;
  @observable toasts: Map<string, Toast> = new Map();

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
  setActiveCollection = (collection: Collection): void => {
    this.activeCollectionId = collection.id;
  };

  @action
  clearActiveCollection = (): void => {
    this.activeCollectionId = undefined;
  };

  @action
  clearActiveDocument = (): void => {
    this.activeDocumentId = undefined;
    this.activeCollectionId = undefined;
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
    this.editMode = true;
  };

  @action
  disableEditMode = () => {
    this.editMode = false;
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
  showToast = (
    message: string,
    options?: {
      type?: "warning" | "error" | "info" | "success",
      timeout?: number,
      action?: {
        text: string,
        onClick: () => void,
      },
    }
  ) => {
    if (!message) return;

    const id = v4();
    const createdAt = new Date().toISOString();
    this.toasts.set(id, { message, createdAt, id, ...options });
    return id;
  };

  @action
  removeToast = (id: string) => {
    this.toasts.delete(id);
  };

  @computed
  get resolvedTheme(): "dark" | "light" {
    if (this.theme === "system") {
      return this.systemTheme;
    }

    return this.theme;
  }

  @computed
  get orderedToasts(): Toast[] {
    return orderBy(Array.from(this.toasts.values()), "createdAt", "desc");
  }

  @computed
  get asJson(): string {
    return JSON.stringify({
      tocVisible: this.tocVisible,
      theme: this.theme,
    });
  }
}

export default UiStore;
