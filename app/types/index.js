// @flow
import { type Location } from "react-router-dom";
import theme from "shared/styles/theme";
import Document from "models/Document";

export type Theme = typeof theme;

export type LocationWithState = Location & {
  state: {
    [key: string]: string,
  },
};

export type Toast = {
  id: string,
  createdAt: string,
  message: string,
  type: "warning" | "error" | "info" | "success",
  timeout?: number,
  action?: {
    text: string,
    onClick: () => void,
  },
};

export type FetchOptions = {
  prefetch?: boolean,
  revisionId?: string,
  shareId?: string,
  force?: boolean,
};

export type NavigationNode = {
  id: string,
  title: string,
  url: string,
  children: NavigationNode[],
};

// Pagination response in an API call
export type Pagination = {
  limit: number,
  nextPath: string,
  offset: number,
};

// Pagination request params
export type PaginationParams = {
  limit?: number,
  offset?: number,
  sort?: string,
  direction?: "ASC" | "DESC",
};

export type SearchResult = {
  ranking: number,
  context: string,
  document: Document,
};
