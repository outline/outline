// @flow

export function homeUrl() {
  return '/dashboard';
}

export function newCollectionUrl() {
  return '/collections/new';
}

export function searchUrl(query: string) {
  return `/search/${query}`;
}
