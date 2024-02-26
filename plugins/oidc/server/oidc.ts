import invariant from "invariant";
import OAuthClient from "@server/utils/oauth";
import env from "./env";

export default class OIDCClient extends OAuthClient {
  endpoints = {
    authorize: env.OIDC_AUTH_URI || "",
    token: env.OIDC_TOKEN_URI || "",
    userinfo: env.OIDC_USERINFO_URI || "",
  };

  constructor() {
    invariant(env.OIDC_CLIENT_ID, "OIDC_CLIENT_ID is required");
    invariant(env.OIDC_CLIENT_SECRET, "OIDC_CLIENT_SECRET is required");

    super(env.OIDC_CLIENT_ID, env.OIDC_CLIENT_SECRET);
  }
}
