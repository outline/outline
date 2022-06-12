import OAuthClient from "./oauth";

export default class AzureClient extends OAuthClient {
  endpoints = {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userinfo: "https://graph.microsoft.com/v1.0/me",
  };
}
