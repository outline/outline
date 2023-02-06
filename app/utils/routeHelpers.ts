import queryString from "query-string";
import Collection from "~/models/Collection";
import Document from "~/models/Document";

export function homePath(): string {
  return "/home";
}

export function draftsPath(): string {
  return "/drafts";
}

export function templatesPath(): string {
  return "/templates";
}

export function archivePath(): string {
  return "/archive";
}

export function trashPath(): string {
  return "/trash";
}

export function settingsPath(): string {
  return "/settings";
}

export function organizationSettingsPath(): string {
  return "/settings/details";
}

export function profileSettingsPath(): string {
  return "/settings";
}

export function accountPreferencesPath(): string {
  return "/settings/preferences";
}

export function groupSettingsPath(): string {
  return "/settings/groups";
}

export function collectionUrl(url: string, section?: string): string {
  if (section) {
    return `${url}/${section}`;
  }
  return url;
}

export function updateCollectionUrl(
  oldUrl: string,
  collection: Collection
): string {
  // Update url to match the current one
  return oldUrl.replace(
    new RegExp("/collection/[0-9a-zA-Z-_~]*"),
    collection.url
  );
}

export function documentUrl(doc: Document): string {
  return doc.url;
}

export function editDocumentUrl(doc: Document): string {
  return `${doc.url}/edit`;
}

export function documentInsightsUrl(doc: Document): string {
  return `${doc.url}/insights`;
}

export function documentHistoryUrl(doc: Document, revisionId?: string): string {
  let base = `${doc.url}/history`;
  if (revisionId) {
    base += `/${revisionId}`;
  }
  return base;
}

/**
 * Replace full url's document part with the new one in case
 * the document slug has been updated
 */
export function updateDocumentUrl(oldUrl: string, document: Document): string {
  // Update url to match the current one
  return oldUrl.replace(
    new RegExp("/doc/([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})"),
    document.url
  );
}

export function newDocumentPath(
  collectionId?: string,
  params: {
    parentDocumentId?: string;
    templateId?: string;
    template?: boolean;
  } = {}
): string {
  return collectionId
    ? `/collection/${collectionId}/new?${queryString.stringify(params)}`
    : `/doc/new`;
}

export function searchPath(
  query?: string,
  params: {
    collectionId?: string;
    ref?: string;
  } = {}
): string {
  let search = queryString.stringify(params);
  let route = "/search";

  if (query) {
    route += `/${encodeURIComponent(query.replace(/%/g, "%25"))}`;
  }

  search = search ? `?${search}` : "";
  return `${route}${search}`;
}

export function sharedDocumentPath(shareId: string, docPath?: string) {
  return docPath ? `/s/${shareId}${docPath}` : `/s/${shareId}`;
}

export function notFoundUrl(): string {
  return "/404";
}

export const matchDocumentSlug =
  ":documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;

export const matchDocumentHistory = `/doc/${matchDocumentSlug}/history/:revisionId?`;

export const matchDocumentInsights = `/doc/${matchDocumentSlug}/insights`;
