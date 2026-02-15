import env from "@server/env";
import type { OAuthClient } from "@server/models";

/**
 * Presents an OAuthClient in RFC 7591 Dynamic Client Registration response format.
 *
 * @param oauthClient The OAuth client to present.
 * @param options Options controlling which optional fields to include.
 * @returns the client registration response.
 */
export function presentDCRClient(oauthClient: OAuthClient) {
  return {
    client_id: oauthClient.clientId,
    client_secret:
      oauthClient.clientType === "confidential"
        ? oauthClient.clientSecret
        : undefined,
    client_id_issued_at: Math.floor(oauthClient.createdAt.getTime() / 1000),
    client_secret_expires_at: 0,
    redirect_uris: oauthClient.redirectUris,
    client_name: oauthClient.name,
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method:
      oauthClient.clientType === "confidential" ? "client_secret_post" : "none",
    ...(oauthClient.developerUrl && { client_uri: oauthClient.developerUrl }),
    ...(oauthClient.avatarUrl && { logo_uri: oauthClient.avatarUrl }),
    ...(oauthClient.registrationAccessToken && {
      registration_access_token: oauthClient.registrationAccessToken,
      registration_client_uri: `${env.URL}/oauth/register/${oauthClient.clientId}`,
    }),
  };
}

/**
 * Presents the OAuth client to the user, including the client secret.
 * This should ONLY be used for admin users who need to manage the OAuth client.
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
    clientType: oauthClient.clientType,
    redirectUris: oauthClient.redirectUris,
    published: oauthClient.published,
    lastActiveAt: oauthClient.lastActiveAt,
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
