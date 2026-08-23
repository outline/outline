import queryString from "query-string";
import type Notebook from "~/models/Notebook";
import type Comment from "~/models/Comment";
import type Note from "~/models/Note";
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
 * Returns the path to a comment within a note.
 *
 * @param document the document the comment belongs to.
 * @param comment the comment to link to.
 * @returns the path to the comment.
 */
export function commentPath(note: Note, comment: Comment): string {
  return `${notePath(note)}?commentId=${comment.id}${comment.isResolved ? "&resolved=1" : ""}`;
}
/**
 * Returns the path to a notebook, optionally within a specific section.
 *
 * @param notebook the notebook to link to.
 * @param section an optional section within the notebook.
 * @returns the path to the notebook.
 */
export function notebookPath(notebook: Notebook, section?: string): string {
  if (section) {
    return `${notebook.path}/${section}`;
  }
  return notebook.path;
}
/**
 * Converts a legacy collection URL to the canonical notebook URL.
 *
 * @param pathname the legacy pathname to convert.
 * @param search the query string to preserve.
 * @param hash the hash fragment to preserve.
 * @returns the canonical notebook URL.
 */
export function legacyNotebookPath(
  pathname: string,
  search = "",
  hash = ""
): string {
  const canonicalPathname = pathname.replace(
    /^\/collections?(?=\/|$)/,
    "/notebook"
  );
  return `${canonicalPathname}${search}${hash}`;
}
/**
 * Returns the path to edit a notebook's overview.
 *
 * @param notebook the notebook to edit.
 * @returns the path to the notebook edit screen.
 */
export function notebookEditPath(notebook: Notebook): string {
  return notebookPath(notebook, "overview/edit");
}
/**
 * Replaces the notebook part of a URL with the notebook's current path,
 * for use when the notebook slug has been updated.
 *
 * @param oldUrl the URL to update.
 * @param notebook the notebook with the current path.
 * @returns the updated URL.
 */
export function updateNotebookPath(oldUrl: string, notebook: Notebook): string {
  // Update url to match the current one
  return oldUrl.replace(new RegExp("/notebook/[0-9a-zA-Z-_~]*"), notebook.path);
}
/**
 * Returns the path to a note.
 *
 * @param doc the document to link to.
 * @returns the path to the note.
 */
export function notePath(doc: Note): string {
  return doc.path;
}
/**
 * Returns the path to edit a note.
 *
 * @param doc the document to edit.
 * @returns the path to the document edit screen.
 */
export function noteEditPath(doc: Note): string {
  return `${notePath(doc)}/edit`;
}
/**
 * Returns the path to a document's history, optionally at a specific
 * revision.
 *
 * @param doc the document to link to.
 * @param revisionId an optional revision to link to.
 * @returns the path to the document history screen.
 */
export function noteHistoryPath(doc: Note, revisionId?: string): string {
  let base = `${notePath(doc)}/history`;
  if (revisionId) {
    base += `/${revisionId}`;
  }
  return base;
}
/**
 * Replace full url's document part with the new one in case
 * the document slug has been updated
 */
export function updateNotePath(oldUrl: string, note: Note): string {
  // Update url to match the current one
  return oldUrl.replace(
    new RegExp("/doc/([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})"),
    note.url
  );
}
/**
 * Returns the path to create a new template, optionally associated with a
 * notebook.
 *
 * @param notebookId an optional notebook to associate the template with.
 * @returns the path to the new template screen.
 */
export function newTemplatePath(notebookId?: string) {
  return notebookId
    ? settingsPath("templates") + `/new?collectionId=${notebookId}`
    : `${settingsPath("templates")}/new`;
}
/**
 * Returns the path to create a new document, optionally within a notebook
 * or from a template.
 *
 * @param notebookId an optional notebook to create the document in.
 * @param params optional parameters such as a template to base the document on.
 * @returns the path to the new document screen.
 */
export function newNotePath(
  notebookId?: string | null,
  params: {
    templateId?: string;
  } = {}
): string {
  const search = queryString.stringify(params);
  return notebookId
    ? `/notebook/${notebookId}/new${search ? `?${search}` : ""}`
    : `/doc/new${search ? `?${search}` : ""}`;
}
/**
 * Returns the path to create a new document nested under a parent note.
 *
 * @param parentDocumentId an optional parent document to nest under.
 * @returns the path to the new nested document screen.
 */
export function newNestedNotePath(parentNoteId?: string): string {
  const search = parentNoteId
    ? `?${queryString.stringify({ parentNoteId })}`
    : "";
  return `/doc/new${search}`;
}
/**
 * Returns the path to create a new document as a sibling at a given index,
 * optionally within a notebook or under a parent note.
 *
 * @param params the notebook, parent document, and index for the new note.
 * @returns the path to the new sibling document screen.
 */
export function newSiblingNotePath(params: {
  notebookId?: string | null;
  parentNoteId?: string;
  index: number;
}): string {
  const query: Record<string, string> = {
    index: String(params.index),
  };
  if (params.parentNoteId) {
    query.parentNoteId = params.parentNoteId;
  }
  if (params.notebookId) {
    query.notebookId = params.notebookId;
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
  notebookId,
  noteId,
  ref,
}: {
  query?: string;
  notebookId?: string;
  noteId?: string;
  ref?: string;
} = {}): string {
  const search = queryString.stringify({
    q: query,
    notebookId,
    noteId,
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
/** Route matcher for a notebook slug. */
export const matchNotebookSlug =
  ":notebookSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";
/** Route matcher for the notebook edit screen. */
export const matchNotebookEdit = `/notebook/${matchNotebookSlug}/overview/edit`;
/** Route matcher for a document slug. */
export const matchNoteSlug =
  ":documentSlug([0-9a-zA-Z-_~]*-[a-zA-z0-9]{10,15})";
/** Route matcher for the document edit screen. */
export const matchNoteEdit = `/doc/${matchNoteSlug}/edit`;
/** Route matcher for the document history screen. */
export const matchNoteHistory = `/doc/${matchNoteSlug}/history/:revisionId?`;
