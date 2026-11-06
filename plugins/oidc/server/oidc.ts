import invariant from "invariant";
import type { AuthenticationProviderConfig } from "@shared/types";
import serverEnv from "@server/env";
import OAuthClient from "@server/utils/oauth";
import env from "./env";

export default class OIDCClient extends OAuthClient {
  endpoints = {
    authorize: env.OIDC_AUTH_URI || "",
    token: env.OIDC_TOKEN_URI || "",
    userinfo: env.OIDC_USERINFO_URI || "",
  };

  /**
   * Creates a client for the provider configured in the environment, or for
   * the given configuration when provided.
   *
   * @param config the configuration of a provider set up by an admin.
   */
  constructor(config?: AuthenticationProviderConfig | null) {
    super(
      config?.clientId ?? env.OIDC_CLIENT_ID ?? "",
      config?.clientSecret ?? env.OIDC_CLIENT_SECRET ?? ""
    );

    if (config) {
      this.endpoints = {
        authorize: config.authorizationUrl,
        token: config.tokenUrl,
        userinfo: config.userInfoUrl,
      };
      this.allowPrivateIPAddress = !serverEnv.isCloudHosted;
      return;
    }

    invariant(env.OIDC_CLIENT_ID, "OIDC_CLIENT_ID is required");
    invariant(env.OIDC_CLIENT_SECRET, "OIDC_CLIENT_SECRET is required");
  }
}
