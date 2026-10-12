import { randomUUID } from "node:crypto";
import { OAuthClient } from "@server/models";
import { sequelize } from "@server/storage/database";
import FileStorage from "@server/storage/files";
import {
  buildMetadataDocumentOAuthClient,
  buildOAuthClient,
  buildTeam,
} from "@server/test/factories";

describe("OAuthClient", () => {
  describe("isDCR and isCIMD", () => {
    it("should identify a dynamically registered client", async () => {
      const client = await buildOAuthClient({ createdById: null });

      expect(client.isDCR).toBe(true);
      expect(client.isCIMD).toBe(false);
      expect(client.clientSecret).toBeTruthy();
      expect(client.registrationAccessTokenHash).toBeTruthy();
    });

    it("should identify a user created client", async () => {
      const client = await buildOAuthClient();

      expect(client.isDCR).toBe(false);
      expect(client.isCIMD).toBe(false);
      expect(client.registrationAccessTokenHash).toBeNull();
    });

    it("should identify a metadata document client", async () => {
      const clientId = `https://${randomUUID()}.example.com/client.json`;
      const client = await buildMetadataDocumentOAuthClient({ clientId });

      expect(client.isDCR).toBe(false);
      expect(client.isCIMD).toBe(true);
      expect(client.clientId).toEqual(clientId);
      expect(client.clientSecret).toBeNull();
      expect(client.registrationAccessTokenHash).toBeNull();
    });
  });

  describe("constraints", () => {
    it("should not allow a client without a team unless it uses a metadata document", async () => {
      const client = await buildOAuthClient({ createdById: null });

      await expect(
        OAuthClient.update(
          { teamId: null },
          { where: { id: client.id }, hooks: false }
        )
      ).rejects.toThrow();
    });

    it("should not allow a metadata document client to have a team", async () => {
      const team = await buildTeam();
      const client = await buildMetadataDocumentOAuthClient();

      await expect(
        OAuthClient.update(
          { teamId: team.id },
          { where: { id: client.id }, hooks: false }
        )
      ).rejects.toThrow();
    });
  });

  describe("logos", () => {
    const buildLogoUrl = () =>
      FileStorage.getUrlForKey(
        OAuthClient.logoKey(randomUUID().replace(/-/g, "").repeat(2), "png")
      );

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should find the key of a copied logo", () => {
      const key = OAuthClient.logoKey("a".repeat(64), "png");

      expect(OAuthClient.logoKeyFromUrl(FileStorage.getUrlForKey(key))).toBe(
        key
      );
    });

    it("should not find a key in a URL that names the same path elsewhere", () => {
      const key = OAuthClient.logoKey("a".repeat(64), "png");

      expect(
        OAuthClient.logoKeyFromUrl(`https://evil.example.com/${key}`)
      ).toBeUndefined();
      expect(OAuthClient.logoKeyFromUrl(null)).toBeUndefined();
    });

    it("should delete the logo when the client is deleted", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const avatarUrl = buildLogoUrl();
      const client = await buildMetadataDocumentOAuthClient({ avatarUrl });

      await client.destroy({ force: true });

      expect(deleteFile).toHaveBeenCalledWith(
        OAuthClient.logoKeyFromUrl(avatarUrl)
      );
    });

    it("should keep a logo that another client uses", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const avatarUrl = buildLogoUrl();
      const client = await buildMetadataDocumentOAuthClient({ avatarUrl });
      await buildMetadataDocumentOAuthClient({ avatarUrl });

      await client.destroy();

      expect(deleteFile).not.toHaveBeenCalled();
    });

    it("should delete a replaced logo", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const avatarUrl = buildLogoUrl();
      const client = await buildMetadataDocumentOAuthClient({ avatarUrl });

      await client.update({ avatarUrl: buildLogoUrl() });

      expect(deleteFile).toHaveBeenCalledWith(
        OAuthClient.logoKeyFromUrl(avatarUrl)
      );
    });

    it("should not delete a logo when the transaction rolls back", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const client = await buildMetadataDocumentOAuthClient({
        avatarUrl: buildLogoUrl(),
      });

      await expect(
        sequelize.transaction(async (transaction) => {
          await client.destroy({ transaction });
          throw new Error("rollback");
        })
      ).rejects.toThrow("rollback");

      expect(deleteFile).not.toHaveBeenCalled();
    });

    it("should not delete a logo that was not copied", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const client = await buildOAuthClient({
        avatarUrl: "https://example.com/logo.png",
      });

      await client.destroy();

      expect(deleteFile).not.toHaveBeenCalled();
    });
  });
});
