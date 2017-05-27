// @flow
export type User = {
  avatarUrl: string,
  id: string,
  name: string,
  username: string,
};

export type Team = {
  id: string,
  name: string,
};

export type NavigationNode = {
  id: string,
  title: string,
  url: string,
  collapsed: boolean,
  children: Array<NavigationNode>,
};

export type Document = {
  collaborators: Array<User>,
  collection: Object,
  createdAt: string,
  createdBy: User,
  html: string,
  id: string,
  private: boolean,
  team: string,
  text: string,
  title: string,
  updatedAt: string,
  updatedBy: User,
  url: string,
};

export type Pagination = {
  limit: number,
  nextPath: string,
  offset: number,
};

export type ApiKey = {
  id: string,
  name: ?string,
  secret: string,
};
