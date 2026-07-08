import queryString from "query-string";
import type Collection from "~/models/Collection";
import type Comment from "~/models/Comment";
import type Document from "~/models/Document";
import env from "~/env";

/**
 * Returns the path to the home screen.
 *
 * @returns the home path.
 */
export function homePath(): string {
  return env.ROOT_SHARE_ID ? "/" : "/home";
}

/**
 * Returns the location descriptor used to trigger a logout.
 *
 * @returns a location object with pathname and search.
 */
export function logoutPath() {
  return {
    pathname: "/",
    search: "logout=true",
  };
}

/**
 * Returns the path to the drafts screen.
 *
 * @returns the drafts path.
 */
export function draftsPath(): string {
  return "/drafts";
}

/**
 * Returns the path to the archive screen.
 *
 * @returns the archive path.
 */
export function archivePath(): string {
  return "/archive";
}

/**
 * Returns the path to the trash screen.
 *
 * @returns the trash path.
 */
export function trashPath(): string {
  return "/trash";
}

/**
 * Returns the path to the debug screen.
 *
 * @returns the debug path.
 */
export function debugPath(): string {
  return "/debug";
}

/**
 * Returns the path to the changesets debug screen.
 *
 * @returns the changesets debug path.
 */
export function debugChangesetsPath(): string {
  return "/debug/changesets";
}

/**
 * Returns the path to a settings screen.
 *
 * @param args optional path segments appended to the settings path.
 * @returns the settings path.
 */
export function settingsPath(...args: string[]): string {
  return "/settings" + (args.length > 0 ? `/${args.join("/")}` : "");
}

/**
 * Returns the path to a comment within a document.
 *
 * @param document the document the comment belongs to.
 * @param comment the comment to link to.
 * @returns the path to the comment.
 */
export function commentPath(document: Document, comment: Comment): string {
  return `${documentPath(document)}?commentId=${comment.id}${
    comment.isResolved ? "&resolved=1" : ""
  }`;
}

/**
 * Returns the path to a collection, optionally within a specific section.
 *
 * @param collection the collection to link to.
 * @param section an optional section within the collection.
 * @returns the path to the collection.
 */
export function collectionPath(
  collection: Collection,
  section?: string
): string {
  if (section) {
    return `${collection.path}/${section}`;
  }
  return collection.path;
}

/**
 * Returns the path to edit a collection's overview.
 *
 * @param collection the collection to edit.
 * @returns the path to the collection edit screen.
 */
export function collectionEditPath(collection: Collection): string {
  return collectionPath(collection, "overview/edit");
}

/**
 * Replaces the collection part of a URL with the collection's current path,
 * for use when the collection slug has been updated.
 *
 * @param oldUrl the URL to update.
 * @param collection the collection with the current path.
 * @returns the updated URL.
 */
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

/**
 * Returns the path to a document.
 *
 * @param doc the document to link to.
 * @returns the path to the document.
 */
export function documentPath(doc: Document): string {
  return doc.path;
}

/**
 * Returns the path to edit a document.
 *
 * @param doc the document to edit.
 * @returns the path to the document edit screen.
 */
export function documentEditPath(doc: Document): string {
  return `${documentPath(doc)}/edit`;
}

/**
 * Returns the path to a document's history, optionally at a specific
 * revision.
 *
 * @param doc the document to link to.
 * @param revisionId an optional revision to link to.
 * @returns the path to the document history screen.
 */
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

/**
 * Returns the path to create a new template, optionally associated with a
 * collection.
 *
 * @param collectionId an optional collection to associate the template with.
 * @returns the path to the new template screen.
 */
export function newTemplatePath(collectionId?: string) {
  return collectionId
    ? settingsPath("templates") + `/new?collectionId=${collectionId}`
    : `${settingsPath("templates")}/new`;
}

/**
 * Returns the path to create a new document, optionally within a collection
 * or from a template.
 *
 * @param collectionId an optional collection to create the document in.
 * @param params optional parameters such as a template to base the document on.
 * @returns the path to the new document screen.
 */
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

/**
 * Returns the path to create a new document nested under a parent document.
 *
 * @param parentDocumentId an optional parent document to nest under.
 * @returns the path to the new nested document screen.
 */
export function newNestedDocumentPath(parentDocumentId?: string): string {
  const search = parentDocumentId
    ? `?${queryString.stringify({ parentDocumentId })}`
    : "";

  return `/doc/new${search}`;
}

/**
 * Returns the path to create a new document as a sibling at a given index,
 * optionally within a collection or under a parent document.
 *
 * @param params the collection, parent document, and index for the new document.
 * @returns the path to the new sibling document screen.
 */
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

/**
 * Returns the path to the search screen, optionally with a query and filters.
 *
 * @param params the search query and optional filters.
 * @returns the path to the search screen.
 */
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

/**
 * Returns the public path for a shared model.
 *
 * @param shareId the identifier of the share.
 * @param modelPath an optional path to the model within the share.
 * @returns the path to the shared model.
 */
export function sharedModelPath(shareId: string, modelPath?: string) {
  if (shareId === env.ROOT_SHARE_ID) {
    return modelPath ? modelPath : "/";
  }

  return modelPath ? `/s/${shareId}${modelPath}` : `/s/${shareId}`;
}

/**
 * Converts a path to a full URL by prepending an origin.
 *
 * @param path the path to convert.
 * @param origin optional origin to use instead of `window.location.origin`.
 * @returns the full URL.
 */
export function urlify(
  path: string,
  origin: string = window.location.origin
): string {
  return `${origin}${path}`;
}

/**
 * Converts a path to a desktop app URL using the outline:// protocol.
 *
 * @param path The path to convert.
 * @param origin Optional origin to use instead of `window.location.origin`.
 * @returns The desktop app URL.
 */
export function desktopify(path: string, origin?: string): string {
  return urlify(path, origin).replace(/^https?:\/\//, "outline://");
}

/** Route matcher for a collection slug. */
export const matchCollectionSlug =
  ":collectionSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

/** Route matcher for the collection edit screen. */
export const matchCollectionEdit = `/collection/${matchCollectionSlug}/overview/edit`;

/** Route matcher for a document slug. */
export const matchDocumentSlug =
  ":documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";

/** Route matcher for the document edit screen. */
export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;

/** Route matcher for the document history screen. */
export const matchDocumentHistory = `/doc/${matchDocumentSlug}/history/:revisionId?`;
