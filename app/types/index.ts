import type { TFunction } from "react-i18next";
import "react-i18next";
import type { Location } from "react-router-dom";
import "react-router-dom";
import theme from "shared/theme";
import RootStore from "stores/RootStore";
import Document from "models/Document";

export type Theme = typeof theme;

export type MenuItemClickable = {
  title: React.ReactNode;
  onClick: (event: React.SyntheticEvent) => void | Promise<void>;
  visible?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type MenuItemWithChildren = {
  title: React.ReactNode;
  visible?: boolean;
  disabled?: boolean;
  style?: Record<string, any>;
  hover?: boolean;
  items: MenuItem[];
  icon?: React.ReactNode;
};

export type MenuSeparator = {
  type: "separator";
  visible?: boolean;
};

export type MenuHeading = {
  type: "heading";
  visible?: boolean;
  title: React.ReactNode;
};

export type ActionContext = {
  isContextMenu: boolean;
  isCommandBar: boolean;
  activeCollectionId: string | null | undefined;
  activeDocumentId: string | null | undefined;
  location: Location;
  stores: RootStore;
  event?: Event;
  t: TFunction;
};

export type Action = {
  id: string;
  name: ((arg0: ActionContext) => string) | string;
  section: ((arg0: ActionContext) => string) | string;
  shortcut?: string[];
  keywords?: string;
  iconInContextMenu?: boolean;
  icon?: React.ReactElement;
  placeholder?: ((arg0: ActionContext) => string) | string;
  selected?: (arg0: ActionContext) => boolean;
  visible?: (arg0: ActionContext) => boolean;
  perform?: (arg0: ActionContext) => any;
  children?: ((arg0: ActionContext) => Action[]) | Action[];
};

export type CommandBarAction = {
  id: string;
  name: string;
  section: string;
  shortcut?: string[];
  keywords?: string;
  placeholder?: string;
  icon?: React.ReactElement;
  perform?: () => any;
  children?: string[];
  parent?: string;
};

export type LocationWithState = Location & {
  state: Record<string, string>;
};

export type Toast = {
  id: string;
  createdAt: string;
  message: string;
  type: "warning" | "error" | "info" | "success";
  timeout?: number;
  reoccurring?: number;
  action?: {
    text: string;
    onClick: () => void;
  };
};

export type FetchOptions = {
  prefetch?: boolean;
  revisionId?: string;
  shareId?: string;
  force?: boolean;
};

export type NavigationNode = {
  id: string;
  title: string;
  url: string;
  children: NavigationNode[];
};

// Pagination response in an API call
export type Pagination = {
  limit: number;
  nextPath: string;
  offset: number;
};

// Pagination request params
export type PaginationParams = {
  limit?: number;
  offset?: number;
  sort?: string;
  direction?: "ASC" | "DESC";
};

export type SearchResult = {
  ranking: number;
  context: string;
  document: Document;
};

export type MenuItem =
  | {
      title: React.ReactNode;
      to: string;
      visible?: boolean;
      selected?: boolean;
      disabled?: boolean;
      icon?: React.ReactNode;
    }
  | MenuItemClickable
  | {
      title: React.ReactNode;
      href: string;
      visible?: boolean;
      selected?: boolean;
      disabled?: boolean;
      level?: number;
      icon?: React.ReactNode;
    }
  | MenuItemWithChildren
  | MenuSeparator
  | MenuHeading;

export type ToastOptions = {
  type: "warning" | "error" | "info" | "success";
  timeout?: number;
  action?: {
    text: string;
    onClick: () => void;
  };
};
