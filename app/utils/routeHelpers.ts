import queryString from "query-string";
import type Collection from "~/models/Collection";
import type Comment from "~/models/Comment";
import type Document from "~/models/Document";
import env from "~/env";

export function homePath(): string {
  return env.ROOT_SHARE_ID ? "/" : "/home";
}

export function logoutPath() {
  return {
    pathname: "/",
    search: "logout=true",
  };
}

export function draftsPath(): string {
  return "/drafts";
}

export function archivePath(): string {
  return "/archive";
}

export function trashPath(): string {
  return "/trash";
}

export function debugPath(): string {
  return "/debug";
}

export function debugChangesetsPath(): string {
  return "/debug/changesets";
}

export function settingsPath(...args: string[]): string {
  return "/settings" + (args.length > 0 ? `/${args.join("/")}` : "");
}

export function commentPath(document: Document, comment: Comment): string {
  return `${documentPath(document)}?commentId=${comment.id}${
    comment.isResolved ? "&resolved=1" : ""
  }`;
}

export function collectionPath(
  collection: Collection,
  section?: string
): string {
  if (section) {
    return `${collection.path}/${section}`;
  }
  return collection.path;
}

export function collectionEditPath(collection: Collection): string {
  return collectionPath(collection, "overview/edit");
}

export function updateCollectionPath(
  oldUrl: string,
  collection: Collection
): string {
  // Update url to match the current one
  return oldUrl.replace(
    new RegExp("/collection/[0-9a-zA-Z-_~]*"),
    collection.path
  );
}

export function documentPath(doc: Document): string {
  return doc.path;
}

export function documentEditPath(doc: Document): string {
  return `${documentPath(doc)}/edit`;
}

export function documentHistoryPath(
  doc: Document,
  revisionId?: string
): string {
  let base = `${documentPath(doc)}/history`;
  if (revisionId) {
    base += `/${revisionId}`;
  }
  return base;
}

/**
 * Replace full url's document part with the new one in case
 * the document slug has been updated
 */
export function updateDocumentPath(oldUrl: string, document: Document): string {
  // Update url to match the current one
  return oldUrl.replace(
    new RegExp("/doc/([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})"),
    document.url
  );
}

export function newTemplatePath(collectionId?: string) {
  return collectionId
    ? settingsPath("templates") + `/new?collectionId=${collectionId}`
    : `${settingsPath("templates")}/new`;
}

export function newDocumentPath(
  collectionId?: string | null,
  params: {
    templateId?: string;
  } = {}
): string {
  const search = queryString.stringify(params);

  return collectionId
    ? `/collection/${collectionId}/new${search ? `?${search}` : ""}`
    : `/doc/new${search ? `?${search}` : ""}`;
}

export function newNestedDocumentPath(parentDocumentId?: string): string {
  const search = parentDocumentId
    ? `?${queryString.stringify({ parentDocumentId })}`
    : "";

  return `/doc/new${search}`;
}

export function newSiblingDocumentPath(params: {
  collectionId?: string | null;
  parentDocumentId?: string;
  index: number;
}): string {
  const query: Record<string, string> = {
    index: String(params.index),
  };
  if (params.parentDocumentId) {
    query.parentDocumentId = params.parentDocumentId;
  }
  if (params.collectionId) {
    query.collectionId = params.collectionId;
  }

  return `/doc/new?${queryString.stringify(query)}`;
}

export function searchPath({
  query,
  collectionId,
  documentId,
  ref,
}: {
  query?: string;
  collectionId?: string;
  documentId?: string;
  ref?: string;
} = {}): string {
  const search = queryString.stringify({
    q: query,
    collectionId,
    documentId,
    ref,
  });

  return `/search${search ? `?${search}` : ""}`;
}

export function sharedModelPath(shareId: string, modelPath?: string) {
  if (shareId === env.ROOT_SHARE_ID) {
    return modelPath ? modelPath : "/";
  }

  return modelPath ? `/s/${shareId}${modelPath}` : `/s/${shareId}`;
}

export function urlify(path: string): string {
  return `${window.location.origin}${path}`;
}

export const matchCollectionSlug =
  ":collectionSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

export const matchCollectionEdit = `/collection/${matchCollectionSlug}/overview/edit`;

export const matchDocumentSlug =
  ":documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;

export const matchDocumentHistory = `/doc/${matchDocumentSlug}/history/:revisionId?`;
