import crypto from "crypto";
import {
  RefreshTokenModel,
  AuthorizationCodeModel,
} from "@node-oauth/oauth2-server";
import { Required } from "utility-types";
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

  async generateAccessToken() {
    return `${OAuthAuthentication.accessTokenPrefix}${crypto
      .randomBytes(32)
      .toString("hex")}`;
  },

  async generateRefreshToken() {
    return `${OAuthAuthentication.refreshTokenPrefix}${crypto
      .randomBytes(32)
      .toString("hex")}`;
  },

  async generateAuthorizationCode() {
    return `${OAuthAuthorizationCode.authorizationCodePrefix}${crypto
      .randomBytes(32)
      .toString("hex")}`;
  },

  async getAccessToken(accessToken: string) {
    const authentication = await OAuthAuthentication.findByAccessToken(
      accessToken
    );
    if (!authentication) {
      return false;
    }

    return {
      accessToken,
      accessTokenExpiresAt: authentication.accessTokenExpiresAt,
      scope: authentication.scope,
      client: {
        id: authentication.oauthClientId,
        grants: this.grants,
      },
      user: authentication.user,
    };
  },

  async getRefreshToken(refreshToken: string) {
    const authentication = await OAuthAuthentication.findByRefreshToken(
      refreshToken
    );
    if (!authentication) {
      return false;
    }

    return {
      refreshToken,
      refreshTokenExpiresAt: authentication.refreshTokenExpiresAt,
      scope: authentication.scope,
      client: {
        id: authentication.oauthClientId,
        grants: this.grants,
      },
      user: authentication.user,
    };
  },

  async getAuthorizationCode(authorizationCode) {
    const code = await OAuthAuthorizationCode.findByCode(authorizationCode);
    if (!code) {
      return false;
    }

    const oauthClient = await OAuthClient.findByPk(code.oauthClientId);
    if (!oauthClient) {
      return false;
    }

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
      user: code.user,
    };
  },

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
      databaseId: client.id,
      grants: this.grants,
    };
  },

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
