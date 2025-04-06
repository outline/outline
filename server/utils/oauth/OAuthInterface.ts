import {
  RefreshTokenModel,
  AuthorizationCodeModel,
} from "@node-oauth/oauth2-server";
import rs from "randomstring";
import { Required } from "utility-types";
import { Scope } from "@shared/types";
import { isUrl } from "@shared/utils/urls";
import {
  OAuthClient,
  OAuthAuthentication,
  OAuthAuthorizationCode,
} from "@server/models";
import { safeEqual } from "@server/utils/crypto";

interface Config {
  grants: string[];
}

export const OAuthInterface: RefreshTokenModel &
  Required<AuthorizationCodeModel, "validateScope" | "validateRedirectUri"> &
  Config = {
  grants: ["authorization_code", "refresh_token"],

  async generateAccessToken() {
    return `${OAuthAuthentication.accessTokenPrefix}${rs.generate(32)}`;
  },

  async generateRefreshToken() {
    return `${OAuthAuthentication.refreshTokenPrefix}${rs.generate(32)}`;
  },

  async generateAuthorizationCode() {
    return `${OAuthAuthorizationCode.authorizationCodePrefix}${rs.generate(
      32
    )}`;
  },

  async getAccessToken(accessToken: string) {
    const authentication = await OAuthAuthentication.findByAccessToken(
      accessToken
    );

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
      return null;
    }

    const oauthClient = await OAuthClient.findByPk(code.oauthClientId, {
      rejectOnEmpty: true,
    });

    return {
      authorizationCode,
      expiresAt: code.expiresAt,
      scope: code.scope,
      redirectUri: code.redirectUri,
      client: {
        id: oauthClient.clientId,
        grants: this.grants,
      },
      user: code.user,
    };
  },

  async getClient(clientId: string, clientSecret: string) {
    const client = await OAuthClient.findOne({
      where: {
        clientId,
      },
    });
    if (!client) {
      return null;
    }

    if (
      clientSecret &&
      client &&
      !safeEqual(client.clientSecret, clientSecret)
    ) {
      return null;
    }

    return {
      id: client.clientId,
      redirectUris: client.redirectUris,
      databaseId: client.id,
      grants: this.grants,
    };
  },

  async saveToken(token, client, user) {
    const accessToken = token.accessToken;
    const refreshToken = token.refreshToken;
    const accessTokenExpiresAt = token.accessTokenExpiresAt;
    const refreshTokenExpiresAt = token.refreshTokenExpiresAt;
    const accessTokenHash = OAuthAuthentication.hash(accessToken);
    const refreshTokenHash = refreshToken
      ? OAuthAuthentication.hash(refreshToken)
      : undefined;

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
    const authorizationCode = code.authorizationCode;
    const expiresAt = code.expiresAt;
    const redirectUri = code.redirectUri;
    const scope = code.scope;

    const authCode = await OAuthAuthorizationCode.create({
      authorizationCodeHash: OAuthAuthorizationCode.hash(authorizationCode),
      expiresAt,
      scope,
      redirectUri,
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
    if (uri.includes("#")) {
      return false;
    }
    if (!client.redirectUris?.includes(uri)) {
      return false;
    }
    if (!isUrl(uri)) {
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
