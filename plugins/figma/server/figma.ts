import { z } from "zod";
import env from "./env";
import { FigmaUtils } from "../shared/FigmaUtils";
import type { UnfurlSignature } from "@server/types";
import isEmpty from "lodash/isEmpty";
import type { User } from "@server/models";
import { Integration } from "@server/models";
import { IntegrationType } from "@shared/types";
import { IntegrationService, UnfurlResourceType } from "@shared/types";
import { cdnPath } from "@shared/utils/urls";
import Logger from "@server/logging/Logger";
import { Minute } from "@shared/utils/time";

const Credentials = Buffer.from(
  `${env.FIGMA_CLIENT_ID}:${env.FIGMA_CLIENT_SECRET}`
).toString("base64");

const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

const AccountResponseSchema = z.object({
  id: z.string(),
  handle: z.string(),
  email: z.string(),
  img_url: z.string(),
});

export class Figma {
  private static supportedHosts = ["www.figma.com", "figma.com"];
  private static supportedFileTypes = [
    "design", // Design files
    "board", // Figjam
    "slides",
    "buzz",
    "site",
    "make",
  ];
  /**
   * Exchange an OAuth code for an access token
   *
   * @param code OAuth code to exchange for an access token
   * @returns An object containing the access token and refresh token
   */
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
        `Error exchanging Figma OAuth code; status: ${res.status}, ${await res.text()}`
      );
    }

    return AccessTokenResponseSchema.parse(await res.json());
  }

  static async refreshToken(refreshToken: string) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${Credentials}`,
    };

    const body = new URLSearchParams();
    body.set("refresh_token", refreshToken);

    const res = await fetch(FigmaUtils.refreshUrl, {
      method: "POST",
      headers,
      body,
    });

    if (res.status !== 200) {
      throw new Error(
        `Error while refreshing access token from Figma; status: ${res.status}, ${await res.text()}`
      );
    }

    return RefreshTokenResponseSchema.parse(await res.json());
  }

  static async getInstalledAccount(accessToken: string) {
    const res = await fetch(FigmaUtils.accountUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status !== 200) {
      throw new Error(
        `Error getting Figma current account; status: ${res.status}, ${await res.text()}`
      );
    }

    return AccountResponseSchema.parse(await res.json());
  }

  static unfurl: UnfurlSignature = async (url: string, actor?: User) => {
    const resource = Figma.parseUrl(url);
    if (!resource || !actor) {
      return;
    }

    const integrations = (await Integration.scope("withAuthentication").findAll(
      {
        where: {
          type: IntegrationType.LinkedAccount,
          service: IntegrationService.Figma,
          userId: actor.id,
          teamId: actor.teamId,
        },
      }
    )) as Integration<IntegrationType.LinkedAccount>[];

    if (integrations.length === 0) {
      return;
    }

    // Try to unfurl with any of the linked accounts
    // Note: We support only one figma account per team for now.
    for (const integration of integrations) {
      try {
        const accessToken =
          await integration.authentication.refreshTokenIfNeeded(
            async (refreshToken: string) => Figma.refreshToken(refreshToken),
            5 * Minute.ms
          );

        const res = await fetch(Figma.fileMetadataUrl(resource.key), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // This connected account has access to the file.
        if (res.status === 200) {
          const data = await res.json();
          return {
            type: UnfurlResourceType.URL,
            url,
            title: data.file.name,
            description: `Created by ${data.file.creator.handle}`,
            thumbnailUrl: data.file.thumbnail_url,
            faviconUrl: cdnPath("/images/figma.png"),
            transformedUnfurl: true,
          };
        }
      } catch (err) {
        Logger.error(
          `Error fetching Figma file metadata for integration ${integration.id}`,
          err
        );
      }
    }

    // Either no linked accounts have access to the file, or we faced an error.
    // Fallback to iframely unfurl either way.
    return;
  };

  private static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (!Figma.supportedHosts.includes(hostname)) {
      return;
    }

    const parts = pathname.split("/");
    const type = parts[1];
    const key = parts[2];

    if (!Figma.supportedFileTypes.includes(type) || isEmpty(key)) {
      return;
    }

    return {
      type,
      key,
    };
  }

  private static fileMetadataUrl(key: string) {
    return `https://api.figma.com/v1/files/${key}/meta`;
  }
}
