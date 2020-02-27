// @flow
import Document from 'models/Document';

export function homeUrl(): string {
  return '/home';
}

export function starredUrl(): string {
  return '/starred';
}

export function newCollectionUrl(): string {
  return '/collections/new';
}

export function collectionUrl(collectionId: string, section: ?string): string {
  const path = `/collections/${collectionId}`;
  if (section) return `${path}/${section}`;
  return path;
}

export function documentUrl(doc: Document): string {
  return doc.url;
}

export function documentEditUrl(doc: Document): string {
  return `${doc.url}/edit`;
}

export function documentMoveUrl(doc: Document): string {
  return `${doc.url}/move`;
}

export function documentHistoryUrl(doc: Document, revisionId?: string): string {
  let base = `${doc.url}/history`;
  if (revisionId) base += `/${revisionId}`;
  return base;
}

/**
 * Replace full url's document part with the new one in case
 * the document slug has been updated
 */
export function updateDocumentUrl(oldUrl: string, newUrl: string): string {
  // Update url to match the current one
  const urlParts = oldUrl.trim().split('/');
  const actions = urlParts.slice(3);
  if (actions[0]) {
    return [newUrl, actions].join('/');
  }
  return newUrl;
}

export function newDocumentUrl(
  collectionId: string,
  parentDocumentId?: string
): string {
  let route = `/collections/${collectionId}/new`;

  if (parentDocumentId) {
    route += `?parentDocumentId=${parentDocumentId}`;
  }

  return route;
}

export function searchUrl(query?: string, collectionId?: string): string {
  let route = '/search';
  if (query) route += `/${encodeURIComponent(query)}`;

  if (collectionId) {
    route += `?collectionId=${collectionId}`;
  }
  return route;
}

export function notFoundUrl(): string {
  return '/404';
}

export const matchDocumentSlug =
  ':documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})';

export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;
