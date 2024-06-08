/* eslint-disable @typescript-eslint/ban-types */
import { Location, LocationDescriptor } from "history";
import { TFunction } from "i18next";
import {
  JSONValue,
  CollectionPermission,
  DocumentPermission,
} from "@shared/types";
import RootStore from "~/stores/RootStore";
import Document from "./models/Document";
import FileOperation from "./models/FileOperation";
import Pin from "./models/Pin";
import Star from "./models/Star";
import UserMembership from "./models/UserMembership";

export type PartialWithId<T> = Partial<T> & { id: string };

export type MenuItemButton = {
  type: "button";
  title: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  dangerous?: boolean;
  visible?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ReactElement;
};

export type MenuItemWithChildren = {
  type: "submenu";
  title: React.ReactNode;
  visible?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  hover?: boolean;

  items: MenuItem[];
  icon?: React.ReactElement;
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
  icon?: React.ReactElement;
};

export type MenuExternalLink = {
  type: "link";
  title: React.ReactNode;
  href: string;
  visible?: boolean;
  selected?: boolean;
  disabled?: boolean;
  level?: number;
  icon?: React.ReactElement;
};

export type MenuItem =
  | MenuInternalLink
  | MenuItemButton
  | MenuExternalLink
  | MenuItemWithChildren
  | MenuSeparator
  | MenuHeading;

export type ActionContext = {
  isContextMenu: boolean;
  isCommandBar: boolean;
  isButton: boolean;
  inStarredSection?: boolean;
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
  iconInContextMenu?: boolean;
  icon?: React.ReactElement | React.FC;
  placeholder?: ((context: ActionContext) => string) | string;
  selected?: (context: ActionContext) => boolean;
  visible?: (context: ActionContext) => boolean;
  /**
   * Perform the action – note this should generally not be called directly, use `performAction`
   * instead. Errors will be caught and displayed to the user as a toast message.
   */
  perform?: (context: ActionContext) => any;
  children?: ((context: ActionContext) => Action[]) | Action[];
};

export type CommandBarAction = {
  id: string;
  name: string;
  section?: string;
  shortcut: string[];
  keywords: string;
  placeholder?: string;
  icon?: React.ReactElement;
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

export type NavigationNode = {
  id: string;
  title: string;
  emoji?: string | null;
  url: string;
  children: NavigationNode[];
  isDraft?: boolean;
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
  context: string;
  document: Document;
};

export type WebsocketEntityDeletedEvent = {
  modelId: string;
};

export type WebsocketEntitiesEvent = {
  documentIds: { id: string; updatedAt?: string }[];
  collectionIds: { id: string; updatedAt?: string }[];
  groupIds: { id: string; updatedAt?: string }[];
  teamIds: string[];
  event: string;
};

export type WebsocketCollectionUserEvent = {
  collectionId: string;
  userId: string;
};

export type WebsocketDocumentUserEvent = {
  documentId: string;
  userId: string;
};

export type WebsocketCollectionUpdateIndexEvent = {
  collectionId: string;
  index: string;
};

export type WebsocketEvent =
  | PartialWithId<Pin>
  | PartialWithId<Star>
  | PartialWithId<FileOperation>
  | PartialWithId<UserMembership>
  | WebsocketCollectionUserEvent
  | WebsocketCollectionUpdateIndexEvent
  | WebsocketEntityDeletedEvent
  | WebsocketEntitiesEvent;

export type AwarenessChangeEvent = {
  states: { user?: { id: string }; cursor: any; scrollY: number | undefined }[];
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
