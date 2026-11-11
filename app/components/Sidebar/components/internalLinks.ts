import { parsePath } from "history";
import parseCollectionSlug from "@shared/utils/parseCollectionSlug";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import {
  isCollectionUrl,
  isDocumentUrl,
  isInternalUrl,
} from "@shared/utils/urls";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type RootStore from "~/stores/RootStore";
import { toRelative } from "~/utils/urls";

/** The canonical location of an internal link, and the model it points to. */
export interface ResolvedInternalLink {
  /** The canonical path, with the search and hash of the link. */
  path: string;
  /** The document that the link points to, if any. */
  document?: Document;
  /** The collection that the link points to, if any. */
  collection?: Collection;
}

/**
 * Returns the router path for a url that points to a page in this app.
 *
 * @param url The url of the link.
 * @returns the path, or undefined if the url must open as a normal link.
 */
export function toInternalPath(url: string): string | undefined {
  if (!isInternalUrl(url)) {
    return undefined;
  }

  try {
    const path = toRelative(url);

    // The API is not part of the app, and the router cannot decode a
    // malformed percent-encoding. The result is used so that the minifier
    // keeps the call.
    const decoded = decodeURI(path);
    return decoded && !path.startsWith("/api/") ? path : undefined;
  } catch (_err) {
    return undefined;
  }
}

/**
 * Resolves an internal path to the canonical path of the document or
 * collection that it points to. A model that is not loaded is fetched, and
 * the path is returned as given if that fails.
 *
 * @param path The internal path of the link.
 * @param stores The root store.
 * @returns the canonical path and the model that it points to.
 */
export async function resolveInternalLink(
  path: string,
  { documents, collections }: Pick<RootStore, "documents" | "collections">
): Promise<ResolvedInternalLink> {
  const { search, hash } = parsePath(path);

  if (isDocumentUrl(path)) {
    const slug = parseDocumentSlug(path);
    const document = slug
      ? (documents.get(slug) ??
        (await documents.fetch(slug).catch(() => undefined)))
      : undefined;
    if (document) {
      return { path: `${document.path}${search}${hash}`, document };
    }
  }

  if (isCollectionUrl(path)) {
    const slug = parseCollectionSlug(path);
    const collection = slug
      ? (collections.get(slug) ??
        (await collections.fetch(slug).catch(() => undefined)))
      : undefined;
    if (collection) {
      return { path: `${collection.path}${search}${hash}`, collection };
    }
  }

  return { path };
}

/**
 * Returns the canonical url for a link, so that it opens directly when it is
 * not handled by the router, such as in a new tab. Other urls are unchanged.
 *
 * @param url The url of the link.
 * @param stores The root store.
 * @returns the canonical url.
 */
export async function toCanonicalUrl(
  url: string,
  stores: Pick<RootStore, "documents" | "collections">
): Promise<string> {
  const path = toInternalPath(url);
  if (!path) {
    return url;
  }

  const resolved = await resolveInternalLink(path, stores);
  return `${new URL(url).origin}${resolved.path}`;
}
