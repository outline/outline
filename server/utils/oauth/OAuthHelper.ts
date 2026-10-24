import type { Context } from "koa";
import isURL from "validator/lib/isURL";
import type { OAuthClientValidation } from "@shared/validations";
import { isLoopbackUri, isPrivateUseSchemeUrl } from "@shared/utils/urls";
import env from "@server/env";

type ClientType = (typeof OAuthClientValidation.clientTypes)[number];

export class OAuthHelper {
  /**
   * The OAuth scopes that the MCP endpoint advertises to clients.
   */
  public static mcpScopes = ["read", "write"];

  /**
   * The OAuth grant types that the authorization server supports.
   */
  public static grantTypes = ["authorization_code", "refresh_token"] as const;

  /**
   * The OAuth response types that the authorization server supports.
   */
  public static responseTypes = ["code"] as const;

  /**
   * The client authentication methods that the token endpoint supports.
   */
  public static tokenEndpointAuthMethods = [
    "client_secret_post",
    "none",
  ] as const;

  /**
   * Returns the client type that corresponds to a token endpoint
   * authentication method. Clients that authenticate with a secret are
   * confidential, all others are public.
   *
   * @param method - the token endpoint authentication method.
   * @returns the client type.
   */
  public static clientTypeForAuthMethod(
    method: (typeof OAuthHelper.tokenEndpointAuthMethods)[number]
  ): ClientType {
    return method === "client_secret_post" ? "confidential" : "public";
  }

  /**
   * Returns the token endpoint authentication method that a client of the
   * given type must use.
   *
   * @param clientType - the client type.
   * @returns the token endpoint authentication method.
   */
  public static authMethodForClientType(
    clientType: ClientType
  ): (typeof OAuthHelper.tokenEndpointAuthMethods)[number] {
    return clientType === "confidential" ? "client_secret_post" : "none";
  }

  /**
   * Whether a URI is acceptable as an OAuth redirect URI. HTTPS is required,
   * except for loopback addresses (RFC 8252 §7.3) and private-use schemes
   * (RFC 8252 §7.1) used by native apps. Fragments and wildcards are rejected.
   *
   * @param uri - the redirect URI to validate.
   * @returns true if the URI is valid.
   */
  public static isValidRedirectUri(uri: string): boolean {
    if (/[\s#*]/.test(uri)) {
      return false;
    }

    // The recommended private-use form, e.g. com.example.app:/oauth2redirect,
    // has no host so it is checked separately.
    if (isPrivateUseSchemeUrl(uri)) {
      return true;
    }

    // Matches the syntax check of the IsUrlList model validator, and requires
    // the "//" authority delimiter that new URL() would otherwise repair.
    if (
      !/^https?:\/\//i.test(uri) ||
      !isURL(uri, {
        protocols: ["http", "https"],
        require_tld: false,
        require_protocol: true,
        allow_underscores: true,
      })
    ) {
      return false;
    }

    // Loopback addresses may use http:// since TLS certificates cannot be
    // obtained for them.
    return /^https:/i.test(uri) || isLoopbackUri(uri);
  }

  /**
   * Whether a requested redirect URI matches one of the registered redirect
   * URIs. Loopback URIs match on any port, because native apps choose a free
   * port at run time (RFC 8252 §7.3). All other URIs must match exactly.
   *
   * @param redirectUris - the registered redirect URIs.
   * @param uri - the requested redirect URI.
   * @returns true if the URI matches a registered redirect URI.
   */
  public static isRegisteredRedirectUri(
    redirectUris: string[],
    uri: string
  ): boolean {
    if (redirectUris.includes(uri)) {
      return true;
    }
    if (!isLoopbackUri(uri)) {
      return false;
    }

    const withoutPort = (value: string) => {
      try {
        const url = new URL(value);
        url.port = "";
        return url.toString();
      } catch {
        return undefined;
      }
    };
    const requested = withoutPort(uri);
    return redirectUris.some(
      (registered) =>
        isLoopbackUri(registered) && withoutPort(registered) === requested
    );
  }

  /**
   * Returns the origin that identifies this deployment as an OAuth issuer and
   * resource server. Cloud-hosted deployments use the request origin so each
   * team subdomain is its own issuer; self-hosted deployments use the
   * configured URL so a reverse proxy that strips the port does not change it.
   *
   * @param ctx - the Koa request context.
   * @returns the origin, e.g. "https://app.getoutline.com".
   */
  public static getIssuer(ctx: Context): string {
    return env.isCloudHosted ? ctx.request.URL.origin : new URL(env.URL).origin;
  }

  /**
   * Builds the `WWW-Authenticate` challenge value for the MCP endpoint,
   * pointing clients at the protected resource metadata document and the
   * scopes required to use the resource (RFC 6750 §3, RFC 9728 §5.1).
   *
   * @param issuer - the origin of this deployment.
   * @returns the header value for a Bearer challenge.
   */
  public static mcpBearerChallenge(issuer: string): string {
    return `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource/mcp", scope="${OAuthHelper.mcpScopes.join(" ")}"`;
  }
}
