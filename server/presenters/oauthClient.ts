import { OAuthClient } from "@server/models";

/**
 * Presents the OAuth client to the user.
 *
 * @param oauthClient The OAuth client to present
 */
export default function presentOAuthClient(oauthClient: OAuthClient) {
  return {
    id: oauthClient.id,
    name: oauthClient.name,
    description: oauthClient.description,
    developerName: oauthClient.developerName,
    developerUrl: oauthClient.developerUrl,
    avatarUrl: oauthClient.avatarUrl,
    clientId: oauthClient.clientId,
    clientSecret: oauthClient.clientSecret,
    redirectUris: oauthClient.redirectUris,
    published: oauthClient.published,
    createdAt: oauthClient.createdAt,
    updatedAt: oauthClient.updatedAt,
  };
}

/**
 * Important: This function is used to present the OAuth client to users
 * that are NOT in the same workspace as the client. Be very careful about
 * what you expose here.
 *
 * @param oauthClient The OAuth client to present
 */
export function presentPublishedOAuthClient(oauthClient: OAuthClient) {
  return {
    name: oauthClient.name,
    description: oauthClient.description,
    developerName: oauthClient.developerName,
    developerUrl: oauthClient.developerUrl,
    avatarUrl: oauthClient.avatarUrl,
    clientId: oauthClient.clientId,
    published: oauthClient.published,
  };
}
