import { HttpsProxyAgent } from "https-proxy-agent";
import type OAuth2Strategy from "passport-oauth2";
import { Strategy } from "passport-oauth2";
import fetch from "@server/utils/fetch";
import Logger from "@server/logging/Logger";

export interface OIDCStrategyOptions
  extends OAuth2Strategy.StrategyOptionsWithRequest {
  /**
   * Authentication method for the token endpoint.
   * - "client_secret_post": Send client_id and client_secret in the request body (default)
   * - "client_secret_basic": Send credentials via HTTP Basic Auth header
   */
  authMethod?: "client_secret_basic" | "client_secret_post";
}

export class OIDCStrategy extends Strategy {
  private authMethod: "client_secret_basic" | "client_secret_post";

  constructor(
    options: OIDCStrategyOptions,
    verify: OAuth2Strategy.VerifyFunctionWithRequest
  ) {
    super(options, verify);

    this.authMethod = options.authMethod || "client_secret_post";

    if (process.env.https_proxy) {
      const httpsProxyAgent = new HttpsProxyAgent(process.env.https_proxy);
      this._oauth2.setAgent(httpsProxyAgent);
    }

    // Override the getOAuthAccessToken method to support client_secret_basic
    if (this.authMethod === "client_secret_basic") {
      this._overrideGetOAuthAccessToken(options);
    }
  }

  authenticate(req: any, options: any) {
    options.originalQuery = req.query;
    super.authenticate(req, options);
  }

  authorizationParams(options: any) {
    return {
      ...options.originalQuery,
      ...super.authorizationParams?.(options),
    };
  }

  /**
   * Override the OAuth2 getOAuthAccessToken method to use HTTP Basic Auth
   */
  private _overrideGetOAuthAccessToken(
    options: OIDCStrategyOptions
  ): void {
    const clientId = options.clientID;
    const clientSecret = options.clientSecret!;
    const tokenURL = options.tokenURL;

    // @ts-expect-error Overriding internal OAuth2 method to support client_secret_basic
    this._oauth2.getOAuthAccessToken = async function (
      code: string,
      params: any,
      callback: Function
    ) {
      try {
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: params.redirect_uri,
        });

        const credentials = Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64");

        Logger.debug("plugins", "Requesting token with client_secret_basic", {
          tokenURL,
        });

        const response = await fetch(tokenURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: body.toString(),
          allowPrivateIPAddress: true,
        });

        if (!response.ok) {
          const errorText = await response.text();
          Logger.error("Token request failed", {
            status: response.status,
            error: errorText,
          });
          return callback(new Error(`Token request failed: ${response.status}`));
        }

        const data = await response.json();

        callback(
          null,
          data.access_token,
          data.refresh_token,
          data
        );
      } catch (error) {
        Logger.error("Token request error", error);
        callback(error);
      }
    };
  }
}
