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

    it("should store a separate file for each client", async () => {
      const first = await buildMetadataDocumentOAuthClient();
      const second = await buildMetadataDocumentOAuthClient();
      const logoUrl = buildLogoUrl();
      mockLogo(logoUrl, png);

      const task = new UploadOAuthClientLogoTask();
      await task.perform({ oauthClientId: first.id, logoUrl });
      await task.perform({ oauthClientId: second.id, logoUrl });

      await Promise.all([first.reload(), second.reload()]);
      expect(first.avatarUrl).toContain(first.id);
      expect(second.avatarUrl).toContain(second.id);
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
