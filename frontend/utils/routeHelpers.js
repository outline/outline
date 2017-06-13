// @flow

export function homeUrl(): string {
  return '/dashboard';
}

export function starredUrl(): string {
  return '/starred';
}

export function newCollectionUrl(): string {
  return '/collections/new';
}

export function searchUrl(query: string): string {
  if (query) return `/search/${query}`;
  return `/search`;
}

export function notFoundUrl(): string {
  return '/404';
}
