import { Location, LocationDescriptor } from "history";
import { TFunction } from "i18next";
import {
  JSONValue,
  CollectionPermission,
  DocumentPermission,
} from "@shared/types";
import RootStore from "~/stores/RootStore";
import { SidebarContextType } from "./components/Sidebar/components/SidebarContext";
import Document from "./models/Document";
import FileOperation from "./models/FileOperation";
import Pin from "./models/Pin";
import Star from "./models/Star";
import User from "./models/User";
import UserMembership from "./models/UserMembership";

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

export type MenuItem =
  | MenuInternalLink
  | MenuItemButton
  | MenuExternalLink
  | MenuItemWithChildren
  | MenuSeparator
  | MenuHeading
  | MenuGroup;

export type ActionContext = {
  isContextMenu: boolean;
  isCommandBar: boolean;
  isButton: boolean;
  sidebarContext?: SidebarContextType;
  activeCollectionId?: string | undefined;
  activeDocumentId: string | undefined;
  currentUserId: string | undefined;
  currentTeamId: string | undefined;
  location: Location;
  stores: RootStore;
  event?: Event;
  t: TFunction;
};

export type Action = {
  type?: undefined;
  id: string;
  analyticsName?: string;
  name: ((context: ActionContext) => string) | string;
  section: ((context: ActionContext) => string) | string;
  shortcut?: string[];
  keywords?: string;
  dangerous?: boolean;
  /** Higher number is higher in results, default is 0. */
  priority?: number;
  iconInContextMenu?: boolean;
  icon?: React.ReactNode;
  placeholder?: ((context: ActionContext) => string) | string;
  selected?: (context: ActionContext) => boolean;
  visible?: (context: ActionContext) => boolean;
  /**
   * Perform the action – note this should generally not be called directly, use `performAction`
   * instead. Errors will be caught and displayed to the user as a toast message.
   */
  perform?: (context: ActionContext) => any;
  to?: string | { url: string; target?: string };
  children?: ((context: ActionContext) => Action[]) | Action[];
};

type BaseActionV2 = {
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

export type ActionV2 = BaseActionV2 & {
  variant: "action";
  dangerous?: boolean;
  tooltip?:
    | ((context: ActionContext) => React.ReactChild | undefined)
    | React.ReactChild;
  perform: (context: ActionContext) => any;
};

export type InternalLinkActionV2 = BaseActionV2 & {
  variant: "internal_link";
  to: ((context: ActionContext) => LocationDescriptor) | LocationDescriptor;
};

export type ExternalLinkActionV2 = BaseActionV2 & {
  variant: "external_link";
  url: string;
  target?: string;
};

export type ActionV2WithChildren = BaseActionV2 & {
  variant: "action_with_children";
  children:
    | ((
        context: ActionContext
      ) => (ActionV2Variant | ActionV2Group | ActionV2Separator)[])
    | (ActionV2Variant | ActionV2Group | ActionV2Separator)[];
};

export type ActionV2Variant =
  | ActionV2
  | InternalLinkActionV2
  | ExternalLinkActionV2
  | ActionV2WithChildren;

// Specific to menu
export type ActionV2Group = {
  type: "action_group";
  name: string;
  actions: (ActionV2Variant | ActionV2Separator)[];
};

// Specific to menu
export type ActionV2Separator = {
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
  value: CollectionPermission | DocumentPermission | typeof EmptySelectValue;
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
