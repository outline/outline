import { z } from "zod";
import env from "./env";
import { FigmaUtils } from "../shared/FigmaUtils";

const Credentials = Buffer.from(
  `${env.FIGMA_CLIENT_ID}:${env.FIGMA_CLIENT_SECRET}`
).toString("base64");

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  user_id_string: z.string(),
});

export class Figma {
  static async oauthAccess(code: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${Credentials}`,
    };

    const body = new URLSearchParams();
    body.set("code", code);
    body.set("redirect_uri", FigmaUtils.callbackUrl());
    body.set("grant_type", "authorization_code");

    const res = await fetch(FigmaUtils.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    if (res.status !== 200) {
      throw new Error(
        `Error exchanging Figma OAuth code; status: ${res.status} ${await res.text()}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }
}
