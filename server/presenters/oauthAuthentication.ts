import { OAuthAuthentication } from "@server/models";
import { presentPublishedOAuthClient } from "./oauthClient";

export default function presentOAuthAuthentication(
  oauthAuthentication: OAuthAuthentication
) {
  return {
    id: oauthAuthentication.id,
    userId: oauthAuthentication.userId,
    oauthClientId: oauthAuthentication.oauthClientId,
    oauthClient: presentPublishedOAuthClient(oauthAuthentication.oauthClient),
    scope: oauthAuthentication.scope,
    lastActiveAt: oauthAuthentication.lastActiveAt,
    createdAt: oauthAuthentication.createdAt,
  };
}
