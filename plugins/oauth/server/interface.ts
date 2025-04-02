import {
  RefreshTokenModel,
  AuthorizationCodeModel,
} from "@node-oauth/oauth2-server";
import rs from "randomstring";
import { WhereOptions } from "sequelize";
import OAuthAuthentication from "./models/OAuthAuthentication";
import OAuthAuthorizationCode from "./models/OAuthAuthorizationCode";
import OAuthClient from "./models/OAuthClient";

interface Config {
  accessTokenPrefix: string;
  refreshTokenPrefix: string;
  clientSecretPrefix: string;
  authorizationCodePrefix: string;
  grants: string[];
}

export const OAuthInterface: RefreshTokenModel &
  AuthorizationCodeModel &
  Config = {
  accessTokenPrefix: "ol_at_",
  refreshTokenPrefix: "ol_rt_",
  clientSecretPrefix: "ol_sk_",
  authorizationCodePrefix: "ol_ac_",
  grants: ["authorization_code", "refresh_token"],

  async generateAccessToken() {
    return `${this.accessTokenPrefix}${rs.generate(32)}`;
  },

  async generateRefreshToken() {
    return `${this.refreshTokenPrefix}${rs.generate(32)}`;
  },

  async generateAuthorizationCode() {
    return `${this.authorizationCodePrefix}${rs.generate(32)}`;
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

  async getAuthorizationCode(authorizationCode: string) {
    const code = await OAuthAuthorizationCode.findByCode(authorizationCode);

    return {
      authorizationCode,
      expiresAt: code.expiresAt,
      scope: code.scope,
      redirectUri: code.redirectUri,
      client: {
        id: code.oauthClientId,
        grants: this.grants,
      },
      user: code.user,
    };
  },

  async getClient(clientId: string, clientSecret: string) {
    const where: WhereOptions<OAuthClient> = {
      clientId,
    };
    if (clientSecret) {
      where.clientSecret = clientSecret;
    }
    const client = await OAuthClient.findOne({
      where,
    });
    if (!client) {
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

    const authentication = await OAuthAuthentication.create({
      accessToken,
      refreshToken,
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
        id: client.databaseId,
        grants: this.grants,
      },
      user: authentication.user,
    };
  },

  async saveAuthorizationCode(code, client, user) {
    const authorizationCode = code.authorizationCode;
    const expiresAt = code.expiresAt;
    const redirectUri = code.redirectUri;

    const authCode = await OAuthAuthorizationCode.create({
      authorizationCodeHash: OAuthAuthorizationCode.hash(authorizationCode),
      expiresAt,
      scope: code.scope,
      redirectUri,
      oauthClientId: client.databaseId,
      userId: user.id,
    });

    return {
      authorizationCode,
      expiresAt,
      scope: code.scope,
      redirectUri,
      client: {
        id: client.databaseId,
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

  async validateRedirectUri() {
    // TODO
    return true;
  },
};
