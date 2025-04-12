import { LinearClient } from "@linear/sdk";
import { z } from "zod";
import { LinearUtils } from "../shared/LinearUtils";
import env from "./env";

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string(),
});

export class Linear {
  static async oauthAccess(code: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    const body = new URLSearchParams();
    body.set("code", code);
    body.set("client_id", env.LINEAR_CLIENT_ID!);
    body.set("client_secret", env.LINEAR_CLIENT_SECRET!);
    body.set("redirect_uri", LinearUtils.callbackUrl());
    body.set("grant_type", "authorization_code");

    const res = await fetch(LinearUtils.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    return AccessTokenResponseSchema.parse(await res.json());
  }

  static async getInstalledWorkspace(accessToken: string) {
    const client = new LinearClient({ accessToken });
    return client.organization;
  }
}
