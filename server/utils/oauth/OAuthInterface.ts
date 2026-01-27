import crypto from "node:crypto";
import type {
  RefreshTokenModel,
  AuthorizationCodeModel,
  User as OAuthUser,
} from "@node-oauth/oauth2-server";
import type { Required } from "utility-types";
import { Scope } from "@shared/types";
import { isUrl } from "@shared/utils/urls";
import {
  OAuthClient,
  OAuthAuthentication,
  OAuthAuthorizationCode,
} from "@server/models";
import { hash, safeEqual } from "@server/utils/crypto";

/**
 * Additional configuration for the OAuthInterface, not part of the
 * OAuth2Server library.
 */
interface Config {
  grants: string[];
}

/**
 * An extension of the OAuth2Server User type that includes a grantId for
 * session tracking.
 */
interface GrantUser extends OAuthUser {
  grantId?: string;
}

/**
 * This interface is used by the OAuth2Server library to handle OAuth2
 * authentication and authorization flows. See the library's documentation:
 *
 * https://node-oauthoauth2-server.readthedocs.io/en/master/model/overview.html
 */
export const OAuthInterface: RefreshTokenModel &
  Required<
    AuthorizationCodeModel,
    | "validateScope"
    | "validateRedirectUri"
    | "generateAccessToken"
    | "generateRefreshToken"
    | "generateAuthorizationCode"
  > &
  Config = {
  /** Supported grant types */
  grants: ["authorization_code", "refresh_token"],

  /**
   * Generates a new access token.
   *
   * @returns The generated access token.
   */
  async generateAccessToken() {
    return `${OAuthAuthentication.accessTokenPrefix}${crypto
      .randomBytes(32)
      .toString("hex")}`;
  },

  /**
   * Generates a new refresh token.
   *
   * @returns The generated refresh token.
   */
  async generateRefreshToken() {
    return `${OAuthAuthentication.refreshTokenPrefix}${crypto
      .randomBytes(32)
      .toString("hex")}`;
  },

  /**
   * Generates a new authorization code.
   *
   * @returns The generated authorization code.
   */
  async generateAuthorizationCode() {
    return `${OAuthAuthorizationCode.authorizationCodePrefix}${crypto
      .randomBytes(32)
      .toString("hex")}`;
  },

  /**
   * Retrieves an access token by its value.
   *
   * @param accessToken The access token to retrieve.
   * @returns The access token if found, false otherwise.
   */
  async getAccessToken(accessToken: string) {
    const authentication =
      await OAuthAuthentication.findByAccessToken(accessToken);
    if (!authentication) {
      return false;
    }

    return {
      accessToken,
      accessTokenExpiresAt: authentication.accessTokenExpiresAt,
      scope: authentication.scope,
      client: {
        id: authentication.oauthClient.clientId,
        grants: this.grants,
      },
      user: authentication.user,
    };
  },

  /**
   * Retrieves a refresh token by its value, with reuse detection.
   *
   * @param refreshToken The refresh token to retrieve.
   * @returns The refresh token if found, false otherwise.
   */
  async getRefreshToken(refreshToken: string) {
    let authentication =
      await OAuthAuthentication.findByRefreshToken(refreshToken);

    if (!authentication) {
      // If the refresh token is not found, it may have already been used or
      // revoked. In this case we perform reuse detection as recommended by RFC 9700.
      authentication = await OAuthAuthentication.findOne({
        where: {
          refreshTokenHash: hash(refreshToken),
        },
        paranoid: false,
      });

      if (authentication?.grantId) {
        await Promise.all([
          OAuthAuthentication.destroy({
            where: {
              grantId: authentication.grantId,
            },
          }),
          OAuthAuthorizationCode.destroy({
            where: {
              grantId: authentication.grantId,
            },
          }),
        ]);
      }

      return false;
    }

    const user = authentication.user;
    Object.assign(user, { grantId: authentication.grantId });

    return {
      refreshToken,
      refreshTokenExpiresAt: authentication.refreshTokenExpiresAt,
      scope: authentication.scope,
      client: {
        id: authentication.oauthClient.clientId,
        grants: this.grants,
      },
      user,
    };
  },

  /**
   * Retrieves an authorization code by its value.
   *
   * @param authorizationCode The authorization code to retrieve.
   * @returns The authorization code if found, false otherwise.
   */
  async getAuthorizationCode(authorizationCode) {
    const code = await OAuthAuthorizationCode.findByCode(authorizationCode);
    if (!code) {
      return false;
    }

    const oauthClient = await OAuthClient.findByPk(code.oauthClientId);
    if (!oauthClient) {
      return false;
    }

    const user = code.user;
    Object.assign(user, { grantId: code.grantId });

    return {
      authorizationCode,
      expiresAt: code.expiresAt,
      scope: code.scope,
      redirectUri: code.redirectUri,
      codeChallenge: code.codeChallenge,
      codeChallengeMethod: code.codeChallengeMethod,
      client: {
        id: oauthClient.clientId,
        grants: this.grants,
      },
      user,
    };
  },

  /**
   * Retrieves a client by its ID and secret.
   *
   * @param clientId The client ID.
   * @param clientSecret The client secret.
   * @returns The client if found and valid, false otherwise.
   */
  async getClient(clientId: string, clientSecret?: string) {
    const client = await OAuthClient.findByClientId(clientId);
    if (!client) {
      return false;
    }

    if (clientSecret && !safeEqual(client.clientSecret, clientSecret)) {
      return false;
    }

    return {
      id: client.clientId,
      redirectUris: client.redirectUris,
      clientType: client.clientType,
      databaseId: client.id,
      grants: this.grants,
    };
  },

  /**
   * Saves an access and refresh token.
   *
   * @param token The token object to save.
   * @param client The client that requested the token.
   * @param user The user that authorized the token.
   * @returns The saved token.
   */
  async saveToken(token, client, user) {
    const {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    } = token;
    const accessTokenHash = hash(accessToken);
    const refreshTokenHash = refreshToken ? hash(refreshToken) : undefined;

    await OAuthAuthentication.create({
      accessTokenHash,
      refreshTokenHash,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      scope: token.scope,
      oauthClientId: client.databaseId,
      userId: user.id,
      grantId: (user as GrantUser).grantId || crypto.randomUUID(),
    });

    return {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      scope: token.scope,
      client: {
        id: client.id,
        grants: this.grants,
      },
      user,
    };
  },

  /**
   * Saves an authorization code.
   *
   * @param code The authorization code object to save.
   * @param client The client that requested the code.
   * @param user The user that authorized the code.
   * @returns The saved authorization code.
   */
  async saveAuthorizationCode(code, client, user) {
    const {
      authorizationCode,
      expiresAt,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
    } = code;

    const authCode = await OAuthAuthorizationCode.create({
      authorizationCodeHash: hash(authorizationCode),
      expiresAt,
      scope,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      oauthClientId: client.databaseId,
      userId: user.id,
      grantId: (user as GrantUser).grantId || crypto.randomUUID(),
    });

    return {
      authorizationCode,
      expiresAt,
      scope,
      redirectUri,
      client: {
        id: client.id,
        grants: this.grants,
      },
      user: authCode.user,
    };
  },

  /**
   * Revokes a refresh token.
   *
   * @param token The token object containing the refresh token to revoke.
   * @returns True if the token was revoked, false otherwise.
   */
  async revokeToken(token) {
    const auth = await OAuthAuthentication.findByRefreshToken(
      token.refreshToken
    );
    if (auth) {
      await auth.destroy();
      return true;
    }
    return false;
  },

  /**
   * Revokes an authorization code.
   *
   * @param code The authorization code object to revoke.
   * @returns True if the code was revoked, false otherwise.
   */
  async revokeAuthorizationCode(code) {
    const authCode = await OAuthAuthorizationCode.findByCode(
      code.authorizationCode
    );
    if (authCode) {
      await authCode.destroy();
      return true;
    }
    return false;
  },

  /**
   * Ensure the redirect URI is not plain HTTP. Custom protocols are allowed.
   * Loopback addresses (RFC 8252 §7.3) are allowed with http:// for native apps.
   *
   * @param uri The redirect URI to validate.
   * @returns True if the URI is valid, false otherwise.
   */
  async validateRedirectUri(uri, client) {
    if (uri.includes("#") || uri.includes("*")) {
      return false;
    }
    if (!client.redirectUris?.includes(uri)) {
      return false;
    }

    // Allow loopback redirects for native/CLI apps (RFC 8252 §7.3)
    // Loopback addresses must use http:// (not https://) since TLS certificates
    // cannot be obtained for loopback addresses.
    try {
      const url = new URL(uri);
      const isLoopback =
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]" ||
        url.hostname === "localhost";

      if (isLoopback && url.protocol === "http:") {
        return true;
      }
    } catch {
      // Invalid URL, will be caught by isUrl check below
    }

    if (!isUrl(uri, { requireHttps: true })) {
      return false;
    }

    return true;
  },

  /**
   * Invoked to check if the requested scope is valid for a particular
   * client/user combination.
   *
   * @param scope The requested scopes.
   * @returns The scopes if valid, false otherwise.
   */
  async validateScope(user, client, scope) {
    if (!scope?.length) {
      return [];
    }

    const scopes = Array.isArray(scope) ? scope : [scope];
    const validAccessScopes = Object.values(Scope);

    return scopes.some((s: string) => {
      if (validAccessScopes.includes(s as Scope)) {
        return true;
      }

      const periodCount = (s.match(/\./g) || []).length;
      const colonCount = (s.match(/:/g) || []).length;

      if (periodCount === 1 && colonCount === 0) {
        return true;
      }

      if (
        colonCount === 1 &&
        validAccessScopes.includes(s.split(":")[1] as Scope)
      ) {
        return true;
      }

      return false;
    })
      ? scopes
      : false;
  },
};
