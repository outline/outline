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

export function slackAuth(
  state: string,
  scopes: string[] = [
    'identity.email',
    'identity.basic',
    'identity.avatar',
    'identity.team',
  ],
  redirectUri: string = `${BASE_URL}/auth/slack`
): string {
  const baseUrl = 'https://slack.com/oauth/authorize';
  const params = {
    client_id: SLACK_KEY,
    scope: scopes ? scopes.join(' ') : '',
    redirect_uri: redirectUri,
    state,
  };

  const urlParams = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `${baseUrl}?${urlParams}`;
}

export function documentNewUrl(doc: Document): string {
  const newUrl = `${doc.collection.url}/new`;
  if (doc.parentDocumentId) {
    return `${newUrl}?parentDocument=${doc.parentDocumentId}`;
  }
  return newUrl;
}

export function documentEditUrl(doc: Document): string {
  return `${doc.url}/edit`;
}

export function documentMoveUrl(doc: Document): string {
  return `${doc.url}/move`;
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

export function newDocumentUrl(collection: Collection): string {
  return `${collection.url}/new`;
}

export function searchUrl(query?: string): string {
  if (query) return `/search/${encodeURIComponent(query)}`;
  return `/search`;
}

export function notFoundUrl(): string {
  return '/404';
}

export const matchDocumentSlug =
  ':documentSlug([0-9a-zA-Z-]*-[a-zA-z0-9]{10,15})';

export const matchDocumentEdit = `/doc/${matchDocumentSlug}/edit`;
export const matchDocumentMove = `/doc/${matchDocumentSlug}/move`;
