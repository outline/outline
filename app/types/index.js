// @flow

export type User = {
  avatarUrl: string,
  id: string,
  name: string,
  email: string,
  username: string,
  isAdmin?: boolean,
  isSuspended?: boolean,
  createdAt: string,
};

export type Revision = {
  id: string,
  documentId: string,
  title: string,
  text: string,
  createdAt: string,
  createdBy: User,
  diff: {
    added: number,
    removed: number,
  },
};

export type Toast = {
  message: string,
  type: 'warning' | 'error' | 'info' | 'success',
};

export type Share = {
  id: string,
  url: string,
  documentTitle: string,
  documentUrl: string,
  createdBy: User,
  createdAt: string,
  updatedAt: string,
};

export type Team = {
  id: string,
  name: string,
  avatarUrl: string,
  slackConnected: boolean,
  googleConnected: boolean,
  sharing: boolean,
  subdomain?: string,
  url: string,
};

export type NavigationNode = {
  id: string,
  title: string,
  url: string,
  children: NavigationNode[],
};

export type Document = {
  collaborators: User[],
  collection: Object,
  createdAt: string,
  createdBy: User,
  html: string,
  id: string,
  starred: boolean,
  views: number,
  team: string,
  text: string,
  title: string,
  updatedAt: string,
  updatedBy: User,
  url: string,
  views: number,
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
  direction?: 'ASC' | 'DESC',
};

export type ApiKey = {
  id: string,
  name: string,
  secret: string,
};

export type SearchResult = {
  ranking: number,
  context: string,
  document: Document,
};
