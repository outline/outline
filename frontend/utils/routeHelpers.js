// @flow

export function homeUrl() {
  return '/dashboard';
}

export function newCollectionUrl() {
  return '/collections/new';
}

export function searchUrl(query: string) {
  if (query) return `/search/${query}`;
  return `/search`;
}
