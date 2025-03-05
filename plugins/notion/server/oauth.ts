import { z } from "zod";
import fetch from "@server/utils/fetch";
import { NotionUtils } from "../shared/NotionUtils";
import env from "./env";

export class NotionOAuth {
  private static tokenUrl = "https://api.notion.com/v1/oauth/token";
  private static credentials = Buffer.from(
    `${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`
  ).toString("base64");

  private static resSchema = z.object({
    access_token: z.string(),
    bot_id: z.string(),
    workspace_id: z.string(),
    workspace_name: z.string().nullish(),
    workspace_icon: z.string().url().nullish(),
  });

  static async oauthAccess(code: string) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${this.credentials}`,
    };
    const body = {
      grant_type: "authorization_code",
      code,
      redirect_uri: NotionUtils.callbackUrl(),
    };

    const res = await fetch(this.tokenUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return this.resSchema.parse(await res.json());
  }
}
