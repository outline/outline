import queryString from "query-string";
import Collection from "~/models/Collection";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
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

export function settingsPath(...args: string[]): string {
  return "/settings" + (args.length > 0 ? `/${args.join("/")}` : "");
}

export function commentPath(document: Document, comment: Comment): string {
  return `${documentPath(document)}?commentId=${comment.id}${
    comment.isResolved ? "&resolved=" : ""
  }`;
}

export function collectionPath(url: string, section?: string): string {
  if (section) {
    return `${url}/${section}`;
  }
  return url;
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

export function documentInsightsPath(doc: Document): string {
  return `${documentPath(doc)}/insights`;
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
  return collectionId
    ? `/collection/${collectionId}/new?${queryString.stringify(params)}`
    : `/doc/new?${queryString.stringify(params)}`;
}

export function newNestedDocumentPath(parentDocumentId?: string): string {
  return `/doc/new?${queryString.stringify({ parentDocumentId })}`;
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
  let search = queryString.stringify({
    q: query,
    collectionId,
    documentId,
    ref,
  });

  search = search ? `?${search}` : "";
  return `/search${search}`;
}

export function sharedDocumentPath(shareId: string, docPath?: string) {
  if (shareId === env.ROOT_SHARE_ID) {
    return docPath ? docPath : "/";
  }

  return docPath ? `/s/${shareId}${docPath}` : `/s/${shareId}`;
}

export function urlify(path: string): string {
  return `${window.location.origin}${path}`;
}

export const matchDocumentSlug =
  ":documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;

export const matchDocumentHistory = `/doc/${matchDocumentSlug}/history/:revisionId?`;

export const matchDocumentInsights = `/doc/${matchDocumentSlug}/insights`;
