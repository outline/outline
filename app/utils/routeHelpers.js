// @flow
import queryString from "query-string";
import Collection from "models/Collection";
import Document from "models/Document";

export function homeUrl(): string {
  return "/home";
}

export function starredUrl(): string {
  return "/starred";
}

export function newCollectionUrl(): string {
  return "/collections/new";
}

export function collectionUrl(url: string, section: ?string): string {
  if (section) return `${url}/${section}`;
  return url;
}

export function updateCollectionUrl(
  oldUrl: string,
  collection: Collection
): string {
  // Update url to match the current one
  return oldUrl.replace(`/collections/${collection.id}`, collection.url);
}

export function documentUrl(doc: Document): string {
  return doc.url;
}

export function editDocumentUrl(doc: Document): string {
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
export function updateDocumentUrl(oldUrl: string, document: Document): string {
  // Update url to match the current one
  return oldUrl.replace(`/doc/${document.id}`, document.url);
}

export function newDocumentUrl(
  collectionId: string,
  params?: {
    parentDocumentId?: string,
    templateId?: string,
    template?: boolean,
  }
): string {
  return `/collections/${collectionId}/new?${queryString.stringify(params)}`;
}

export function searchUrl(
  query?: string,
  params?: {
    collectionId?: string,
    ref?: string,
  }
): string {
  let search = queryString.stringify(params);
  let route = "/search";

  if (query) {
    route += `/${encodeURIComponent(query.replace("%", "%25"))}`;
  }

  search = search ? `?${search}` : "";
  return `${route}${search}`;
}

export function notFoundUrl(): string {
  return "/404";
}

export const matchDocumentSlug =
  ":documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;
