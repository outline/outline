import invariant from "invariant";
import JWT from "jsonwebtoken";
import OAuthClient from "@server/utils/oauth";
import env from "./env";

type AzurePayload = {
  /** A GUID that represents the Azure AD tenant that the user is from */
  tid: string;
};

export default class AzureClient extends OAuthClient {
  endpoints = {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userinfo: "https://graph.microsoft.com/v1.0/me",
  };

  constructor() {
    invariant(env.AZURE_CLIENT_ID, "AZURE_CLIENT_ID is required");
    invariant(env.AZURE_CLIENT_SECRET, "AZURE_CLIENT_SECRET is required");

    super(env.AZURE_CLIENT_ID, env.AZURE_CLIENT_SECRET);
  }

  async rotateToken(
    accessToken: string,
    refreshToken: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }> {
    if (env.isCloudHosted) {
      return super.rotateToken(accessToken, refreshToken);
    }

    const payload = JWT.decode(accessToken) as AzurePayload;
    return super.rotateToken(
      accessToken,
      refreshToken,
      `https://login.microsoftonline.com/${payload.tid}/oauth2/v2.0/token`
    );
  }
}
