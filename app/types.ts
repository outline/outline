import type { Location, LocationDescriptor } from "history";
import type { TFunction } from "i18next";
import type {
  JSONValue,
  CollectionPermission,
  DocumentPermission,
  GroupPermission,
} from "@shared/types";
import type RootStore from "~/stores/RootStore";
import type { SidebarContextType } from "./components/Sidebar/components/SidebarContext";
import type Model from "./models/base/Model";
import type Document from "./models/Document";
import type FileOperation from "./models/FileOperation";
import type Pin from "./models/Pin";
import type Star from "./models/Star";
import type User from "./models/User";
import type UserMembership from "./models/UserMembership";
import type Policy from "./models/Policy";

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
  Required<Pick<T, K>>;

export type MenuItemButton = {
  type: "button";
  title: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  dangerous?: boolean;
  visible?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  tooltip?: React.ReactChild;
};

export type MenuItemWithChildren = {
  type: "submenu";
  title: React.ReactNode;
  visible?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  hover?: boolean;
  /** Condition to check before preventing the submenu from closing */
  preventCloseCondition?: () => boolean;
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

export type MenuInternalLink = {
  type: "route";
  title: React.ReactNode;
  to: LocationDescriptor;
  visible?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type MenuExternalLink = {
  type: "link";
  title: React.ReactNode;
  href: string | { url: string; target?: string };
  visible?: boolean;
  selected?: boolean;
  disabled?: boolean;
  level?: number;
  icon?: React.ReactNode;
};

export type MenuGroup = {
  type: "group";
  title: React.ReactNode;
  visible?: boolean;
  icon?: React.ReactNode; // added for backward compatibility
  items: MenuItem[];
};

export type MenuCustomContent = {
  type: "custom";
  visible?: boolean;
  content: React.ReactNode;
};

export type MenuItem =
  | MenuInternalLink
  | MenuItemButton
  | MenuExternalLink
  | MenuItemWithChildren
  | MenuSeparator
  | MenuHeading
  | MenuGroup
  | MenuCustomContent;

export type ActionContext = {
  isMenu: boolean;
  isCommandBar: boolean;
  isButton: boolean;
  sidebarContext?: SidebarContextType;

  // Legacy (backward compatibility) - returns primary active model's ID
  activeCollectionId?: string | undefined;
  activeDocumentId: string | undefined;

  // New API - work directly with Model instances
  getActiveModels: <T extends Model>(
    modelClass: new (...args: any[]) => T
  ) => T[];
  getActiveModel: <T extends Model>(
    modelClass: new (...args: any[]) => T
  ) => T | undefined;
  getActivePolicies: <T extends Model>(
    modelClass: new (...args: any[]) => T
  ) => Policy[];
  isModelActive: (model: Model) => boolean;
  activeModels: ReadonlySet<Model>;

  currentUserId: string | undefined;
  currentTeamId: string | undefined;
  location: Location;
  stores: RootStore;
  event?: Event;
  t: TFunction;
};

type BaseAction = {
  type: "action";
  id: string;
  analyticsName?: string;
  name: ((context: ActionContext) => React.ReactNode) | React.ReactNode;
  section: ((context: ActionContext) => string) | string;
  shortcut?: string[];
  keywords?: string;
  /** Higher number is higher in results, default is 0. */
  priority?: number;
  icon?: ((context: ActionContext) => React.ReactNode) | React.ReactNode;
  iconInContextMenu?: boolean;
  placeholder?: ((context: ActionContext) => string) | string;
  selected?: ((context: ActionContext) => boolean) | boolean;
  visible?: ((context: ActionContext) => boolean) | boolean;
  disabled?: ((context: ActionContext) => boolean) | boolean;
};

export type Action = BaseAction & {
  variant: "action";
  dangerous?: boolean;
  tooltip?:
    | ((context: ActionContext) => React.ReactChild | undefined)
    | React.ReactChild;
  perform: (context: ActionContext) => any;
};

export type InternalLinkAction = BaseAction & {
  variant: "internal_link";
  to: ((context: ActionContext) => LocationDescriptor) | LocationDescriptor;
};

export type ExternalLinkAction = BaseAction & {
  variant: "external_link";
  url: string;
  target?: string;
};

export type ActionWithChildren = BaseAction & {
  variant: "action_with_children";
  children:
    | ((
        context: ActionContext
      ) => (ActionVariant | ActionGroup | ActionSeparator)[])
    | (ActionVariant | ActionGroup | ActionSeparator)[];
};

export type ActionVariant =
  | Action
  | InternalLinkAction
  | ExternalLinkAction
  | ActionWithChildren;

// Specific to menu
export type ActionGroup = {
  type: "action_group";
  name: string;
  actions: (ActionVariant | ActionSeparator)[];
};

// Specific to menu
export type ActionSeparator = {
  type: "action_separator";
};

export type CommandBarAction = {
  id: string;
  name: string;
  section?: string;
  shortcut: string[];
  keywords: string;
  placeholder?: string;
  icon?: React.ReactNode;
  perform?: () => void;
  children?: string[];
  parent?: string;
};

export type LocationWithState = Location & {
  state: Record<string, string>;
};

export type FetchOptions = {
  prefetch?: boolean;
  revisionId?: string;
  shareId?: string;
  force?: boolean;
};

export type CollectionSort = {
  field: string;
  direction: "asc" | "desc";
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
  id: string;
  ranking: number;
  context?: string;
  document: Document;
};

export type WebsocketEntityDeletedEvent = {
  modelId: string;
};

export type WebsocketEntitiesEvent = {
  documentIds: { id: string; updatedAt?: string }[];
  collectionIds: { id: string; updatedAt?: string }[];
  groupIds: { id: string; updatedAt?: string }[];
  invalidatedPolicies: string[];
  teamIds: string[];
  event: string;
};

export type WebsocketCollectionUpdateIndexEvent = {
  collectionId: string;
  index: string;
};

export type WebsocketCommentReactionEvent = {
  emoji: string;
  commentId: string;
  user: User;
};

export type WebsocketEvent =
  | PartialExcept<Pin, "id">
  | PartialExcept<Star, "id">
  | PartialExcept<FileOperation, "id">
  | PartialExcept<UserMembership, "id">
  | WebsocketCollectionUpdateIndexEvent
  | WebsocketEntityDeletedEvent
  | WebsocketEntitiesEvent
  | WebsocketCommentReactionEvent;

type CursorPosition = {
  type: {
    client: number;
    clock: number;
  };
  tname: string | null;
  item: {
    client: number;
    clock: number;
  };
  assoc: number;
};

type Cursor = {
  anchor: CursorPosition;
  head: CursorPosition;
};

export type AwarenessChangeEvent = {
  states: {
    clientId: number;
    user?: { id: string };
    cursor: Cursor;
    scrollY: number | undefined;
  }[];
};

export const EmptySelectValue = "__empty__";

export type Permission = {
  label: string;
  value:
    | CollectionPermission
    | DocumentPermission
    | GroupPermission
    | typeof EmptySelectValue;
  divider?: boolean;
};

// TODO: Can we make this type driven by the @Field decorator
export type Properties<C> = {
  [Property in keyof C as C[Property] extends JSONValue
    ? Property
    : never]?: C[Property];
};

export enum CommentSortType {
  MostRecent = "mostRecent",
  OrderInDocument = "orderInDocument",
}

export type CommentSortOption =
  | { type: CommentSortType.MostRecent }
  | { type: CommentSortType.OrderInDocument; referencedCommentIds: string[] };
