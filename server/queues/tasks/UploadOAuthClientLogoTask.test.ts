import { randomUUID } from "node:crypto";
import { http, HttpResponse } from "msw";
import { buildMetadataDocumentOAuthClient } from "@server/test/factories";
import { server } from "@server/test/msw";
import UploadOAuthClientLogoTask from "./UploadOAuthClientLogoTask";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

const buildLogoUrl = () => `https://${randomUUID()}.example.com/logo.png`;

const mockLogo = (
  url: string,
  body: Buffer | string,
  init: { status?: number; headers?: Record<string, string> } = {}
) => {
  server.use(
    http.get(
      url,
      () =>
        new HttpResponse(body, {
          status: init.status ?? 200,
          headers: { "Content-Type": "image/png", ...init.headers },
        })
    )
  );
};

describe("UploadOAuthClientLogoTask", () => {
  describe("detectImageType", () => {
    it("should detect raster images from their leading bytes", () => {
      expect(UploadOAuthClientLogoTask.detectImageType(png)?.contentType).toBe(
        "image/png"
      );
      expect(
        UploadOAuthClientLogoTask.detectImageType(
          Buffer.from([0xff, 0xd8, 0xff, 0xe0])
        )?.contentType
      ).toBe("image/jpeg");
      expect(
        UploadOAuthClientLogoTask.detectImageType(Buffer.from("GIF89a..."))
          ?.contentType
      ).toBe("image/gif");
      expect(
        UploadOAuthClientLogoTask.detectImageType(
          Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")
        )?.contentType
      ).toBe("image/webp");
    });

    it("should not detect SVG or HTML", () => {
      expect(
        UploadOAuthClientLogoTask.detectImageType(
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
        )
      ).toBeUndefined();
      expect(
        UploadOAuthClientLogoTask.detectImageType(
          Buffer.from("<html><script>alert(1)</script></html>")
        )
      ).toBeUndefined();
    });
  });

  describe("perform", () => {
    it("should store the logo and update the client", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const logoUrl = buildLogoUrl();
      mockLogo(logoUrl, png);

      await new UploadOAuthClientLogoTask().perform({
        oauthClientId: client.id,
        logoUrl,
      });

      await client.reload();
      expect(client.avatarUrl).toContain("oauth-clients/");
      expect(client.avatarUrl).not.toContain("example.com");
    });

    it("should share one file between clients with the same logo", async () => {
      const first = await buildMetadataDocumentOAuthClient();
      const second = await buildMetadataDocumentOAuthClient();
      const logoUrl = buildLogoUrl();
      mockLogo(logoUrl, png);

      const task = new UploadOAuthClientLogoTask();
      await task.perform({ oauthClientId: first.id, logoUrl });
      await task.perform({ oauthClientId: second.id, logoUrl });

      await Promise.all([first.reload(), second.reload()]);
      expect(second.avatarUrl).toEqual(first.avatarUrl);
    });

    it("should not store content that is not an image", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const logoUrl = buildLogoUrl();
      mockLogo(logoUrl, "<html><script>alert(1)</script></html>");

      await new UploadOAuthClientLogoTask().perform({
        oauthClientId: client.id,
        logoUrl,
      });

      await client.reload();
      expect(client.avatarUrl).toBeNull();
    });

    it("should not follow redirects", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const logoUrl = buildLogoUrl();
      const target = buildLogoUrl();
      mockLogo(target, png);
      mockLogo(logoUrl, "", { status: 302, headers: { Location: target } });

      await new UploadOAuthClientLogoTask().perform({
        oauthClientId: client.id,
        logoUrl,
      });

      await client.reload();
      expect(client.avatarUrl).toBeNull();
    });

    it("should reject a logo larger than the limit", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const logoUrl = buildLogoUrl();
      mockLogo(
        logoUrl,
        Buffer.concat([
          png,
          Buffer.alloc(UploadOAuthClientLogoTask.maxLogoSize),
        ])
      );

      await expect(
        new UploadOAuthClientLogoTask().perform({
          oauthClientId: client.id,
          logoUrl,
        })
      ).rejects.toThrow();

      await client.reload();
      expect(client.avatarUrl).toBeNull();
    });
  });
});
