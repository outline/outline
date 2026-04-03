import Logger from "@server/logging/Logger";
import { AuthenticationError, InvalidRequestError } from "../errors";
import fetch from "./fetch";

export default abstract class OAuthClient {
  private clientId: string;
  private clientSecret: string;
  protected authMethod?: "client_secret_basic" | "client_secret_post";

  protected endpoints = {
    authorize: "",
    token: "",
    userinfo: "",
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
        allowPrivateIPAddress: true,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      throw InvalidRequestError(err.message);
    }

    const success = response.status >= 200 && response.status < 300;
    if (!success) {
      throw AuthenticationError();
    }

    try {
      data = await response.json();
    } catch (err) {
      throw InvalidRequestError(err.message);
    }

    return data;
  };

  async rotateToken(
    _accessToken: string,
    refreshToken: string,
    endpoint = this.endpoints.token
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    let data;
    let response;

    try {
      Logger.debug("utils", "Rotating token", { endpoint });

      const body = new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });

      // Determine authentication method
      const useBasicAuth = this.authMethod === "client_secret_basic";

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (useBasicAuth) {
        // Use HTTP Basic Auth
        const credentials = Buffer.from(
          `${this.clientId}:${this.clientSecret}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${credentials}`;
      } else {
        // Use client_secret_post (default)
        body.append("client_id", this.clientId);
        body.append("client_secret", this.clientSecret);
      }

      response = await fetch(endpoint, {
        method: "POST",
        allowPrivateIPAddress: true,
        headers,
        body: body,
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
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }
}
