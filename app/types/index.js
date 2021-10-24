// @flow
import { type TFunction } from "react-i18next";
import { type Location } from "react-router-dom";
import theme from "shared/theme";
import RootStore from "stores/RootStore";
import Document from "models/Document";

export type Theme = typeof theme;

export type MenuItemClickable = {|
  title: React.Node,
  onClick: (event: SyntheticEvent<>) => void | Promise<void>,
  visible?: boolean,
  selected?: boolean,
  disabled?: boolean,
  icon?: React.Node,
|};

export type MenuItemWithChildren = {|
  title: React.Node,
  visible?: boolean,
  disabled?: boolean,
  style?: Object,
  hover?: boolean,
  items: MenuItem[],
  icon?: React.Node,
|};

export type MenuSeparator = {|
  type: "separator",
  visible?: boolean,
|};

export type MenuHeading = {|
  type: "heading",
  visible?: boolean,
  title: React.Node,
|};

export type ActionContext = {
  isContextMenu: boolean,
  isCommandBar: boolean,
  activeCollectionId: ?string,
  activeDocumentId: ?string,
  location: Location,
  stores: RootStore,
  event?: Event,
  t: TFunction,
};

export type Action = {|
  id: string,
  name: ((ActionContext) => string) | string,
  section: ((ActionContext) => string) | string,
  shortcut?: string[],
  keywords?: string,
  iconInContextMenu?: boolean,
  icon?: React.Element,
  placeholder?: ((ActionContext) => string) | string,
  selected?: (ActionContext) => boolean,
  visible?: (ActionContext) => boolean,
  perform?: (ActionContext) => any,
  children?: ((ActionContext) => Action[]) | Action[],
|};

export type CommandBarAction = {|
  id: string,
  name: string,
  section: string,
  shortcut?: string[],
  keywords?: string,
  placeholder?: string,
  icon?: React.Element,
  perform?: () => any,
  children?: string[],
  parent?: string,
|};

export type LocationWithState = Location & {
  state: {
    [key: string]: string,
  },
};

export type Toast = {|
  id: string,
  createdAt: string,
  message: string,
  type: "warning" | "error" | "info" | "success",
  timeout?: number,
  reoccurring?: number,
  action?: {
    text: string,
    onClick: () => void,
  },
|};

export type FetchOptions = {
  prefetch?: boolean,
  revisionId?: string,
  shareId?: string,
  force?: boolean,
};

export type NavigationNode = {|
  id: string,
  title: string,
  url: string,
  children: NavigationNode[],
|};

// Pagination response in an API call
export type Pagination = {
  limit: number,
  nextPath: string,
  offset: number,
};

// Pagination request params
export type PaginationParams = {|
  limit?: number,
  offset?: number,
  sort?: string,
  direction?: "ASC" | "DESC",
|};

export type SearchResult = {
  ranking: number,
  context: string,
  document: Document,
};

export type MenuItem =
  | {|
      title: React.Node,
      to: string,
      visible?: boolean,
      selected?: boolean,
      disabled?: boolean,
      icon?: React.Node,
    |}
  | MenuItemClickable
  | {|
      title: React.Node,
      href: string,
      visible?: boolean,
      selected?: boolean,
      disabled?: boolean,
      level?: number,
      icon?: React.Node,
    |}
  | MenuItemWithChildren
  | MenuSeparator
  | MenuHeading;

export type ToastOptions = {|
  type: "warning" | "error" | "info" | "success",
  timeout?: number,
  action?: {
    text: string,
    onClick: () => void,
  },
|};
