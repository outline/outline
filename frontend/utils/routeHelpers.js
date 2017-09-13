// @flow
import Document from 'models/Document';
import Collection from 'models/Collection';

export function homeUrl(): string {
  return '/dashboard';
}

export function starredUrl(): string {
  return '/starred';
}

export function newCollectionUrl(): string {
  return '/collections/new';
}

export function collectionUrl(collectionId: string): string {
  return `/collections/${collectionId}`;
}

export function documentUrl(doc: Document): string {
  return doc.url;
}

export function documentEditUrl(doc: Document): string {
  return `${doc.url}/edit`;
}

export function newDocumentUrl(collection: Collection): string {
  return `${collection.url}/new`;
}

export function searchUrl(query?: string): string {
  if (query) return `/search/${query}`;
  return `/search`;
}

export function notFoundUrl(): string {
  return '/404';
}

/**
 * Replace full url's document part with the new one in case
 * the document slug has been updated
 */
export function updateDocumentUrl(oldUrl: string, newUrl: string): string {
  // Update url to match the current one
  const urlParts = oldUrl.split('/');
  return [newUrl, urlParts.slice(3)].join('/');
}
