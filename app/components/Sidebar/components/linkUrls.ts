import { parsePath } from "history";
import parseCollectionSlug from "@shared/utils/parseCollectionSlug";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import {
  getHostname,
  isCollectionUrl,
  isDocumentUrl,
  isInternalUrl,
  isUrl,
  sanitizeUrl,
} from "@shared/utils/urls";
import { NavigationLinkValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type RootStore from "~/stores/RootStore";
import { toRelative } from "~/utils/urls";

type LinkStores = Pick<RootStore, "documents" | "collections" | "unfurls">;

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
): Promise<{ path: string; document?: Document; collection?: Collection }> {
  const { search, hash } = parsePath(path);

  const documentSlug = isDocumentUrl(path)
    ? parseDocumentSlug(path)
    : undefined;
  const document = documentSlug
    ? await documents.fetch(documentSlug).catch(() => undefined)
    : undefined;
  if (document) {
    return { path: `${document.path}${search}${hash}`, document };
  }

  const collectionSlug = isCollectionUrl(path)
    ? parseCollectionSlug(path)
    : undefined;
  const collection = collectionSlug
    ? await collections.fetch(collectionSlug).catch(() => undefined)
    : undefined;
  if (collection) {
    return { path: `${collection.path}${search}${hash}`, collection };
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

/**
 * Returns a title for a link: the title of the document or collection for a
 * page in this app, otherwise the title from the unfurl endpoint.
 *
 * @param url The url of the link.
 * @param stores The root store.
 * @returns the title, or undefined if none is available.
 */
export async function fetchLinkTitle(
  url: string,
  stores: LinkStores
): Promise<string | undefined> {
  const path = toInternalPath(url);
  let title: string | undefined;

  if (path) {
    const { document, collection } = await resolveInternalLink(path, stores);
    title = document?.title ?? collection?.name;
  } else {
    const unfurl = await stores.unfurls
      .fetchUnfurl({ url })
      .catch(() => undefined);
    title =
      unfurl && "title" in unfurl.data && typeof unfurl.data.title === "string"
        ? unfurl.data.title
        : undefined;
  }

  return title?.trim().slice(0, NavigationLinkValidation.maxTitleLength);
}

/**
 * Returns the url of a link when the text is a url, so that text pasted or
 * typed into an input can be added as a link instead.
 *
 * @param text The text to check.
 * @returns the normalized url, or undefined if the text is not a url.
 */
export function toLinkUrl(text: string): string | undefined {
  const trimmed = text.trim();
  if (
    !trimmed ||
    /\s/.test(trimmed) ||
    !isUrl(trimmed, { requireProtocol: false })
  ) {
    return undefined;
  }

  const url = sanitizeUrl(trimmed);
  return url && isUrl(url) ? url : undefined;
}

/**
 * Adds a sidebar link for a url, titled with the page title when one is
 * available and the hostname otherwise.
 *
 * @param options The collection, position and url of the new link.
 * @returns a promise that resolves to the new link node.
 */
export async function addLinkFromUrl({
  stores,
  collection,
  parentDocumentId,
  index,
  url,
}: {
  stores: LinkStores;
  collection: Collection;
  parentDocumentId?: string;
  index?: number;
  url: string;
}) {
  // Both resolve an internal link through the same store request.
  const [canonicalUrl, title] = await Promise.all([
    toCanonicalUrl(url, stores),
    fetchLinkTitle(url, stores),
  ]);

  return collection.addLink(
    { url: canonicalUrl, title: title || getHostname(canonicalUrl) || url },
    parentDocumentId,
    index
  );
}
