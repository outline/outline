import fetch from "fetch-with-proxy";
import { AuthenticationError, InvalidRequestError } from "../errors";

export default abstract class OAuthClient {
  private clientId: string;
  private clientSecret: string;

  protected endpoints = {
    authorize: "",
    token: "",
    userinfo: "",
    endSession: "",
  };

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  userInfo = async (accessToken: string) => {
    let data;
    let response;

    try {
      response = await fetch(this.endpoints.userinfo, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      data = await response.json();
    } catch (err) {
      throw InvalidRequestError(err.message);
    }

    const success = response.status >= 200 && response.status < 300;
    if (!success) {
      throw AuthenticationError();
    }

    return data;
  };

  rotateToken = async (
    refreshToken: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }> => {
    let data;
    let response;

    try {
      response = await fetch(this.endpoints.token, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      data = await response.json();
    } catch (err) {
      throw InvalidRequestError(err.message);
    }

    const success = response.status >= 200 && response.status < 300;
    if (!success) {
      throw AuthenticationError();
    }

    return {
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  };
}
