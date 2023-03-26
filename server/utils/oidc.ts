import env from "@server/env";
import OAuthClient from "./oauth";

export default class OIDCClient extends OAuthClient {
  endpoints = {
    authorize: env.OIDC_AUTH_URI || "",
    token: env.OIDC_TOKEN_URI || "",
    userinfo: env.OIDC_USERINFO_URI || "",
    endSession: env.OIDC_END_SESSION_URI || "",
  };
}
