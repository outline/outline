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
    const buildHash = () => randomUUID().replace(/-/g, "").repeat(2);
    const buildLogoUrl = (clientId: string) =>
      FileStorage.getUrlForKey(
        OAuthClient.logoKey(clientId, buildHash(), "png")
      );
    const buildClientWithLogo = () => {
      const id = randomUUID();
      return buildMetadataDocumentOAuthClient({
        id,
        avatarUrl: buildLogoUrl(id),
      });
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should find the key of a copied logo", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const key = OAuthClient.logoKey(client.id, "a".repeat(64), "png");

      expect(client.logoKeyFromUrl(FileStorage.getUrlForKey(key))).toBe(key);
    });

    it("should not find a key in a URL on another host", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const key = OAuthClient.logoKey(client.id, "a".repeat(64), "png");

      expect(
        client.logoKeyFromUrl(`https://evil.example.com/${key}`)
      ).toBeUndefined();
      expect(client.logoKeyFromUrl(null)).toBeUndefined();
    });

    it("should not find a key for the logo of another client", async () => {
      const client = await buildMetadataDocumentOAuthClient();

      expect(client.logoKeyFromUrl(buildLogoUrl(randomUUID()))).toBeUndefined();
    });

    it("should not find a key that leaves the folder of the client", async () => {
      const client = await buildMetadataDocumentOAuthClient();
      const key = `${OAuthClient.logoKeyPrefix(client.id)}..`;

      expect(
        client.logoKeyFromUrl(FileStorage.getUrlForKey(key))
      ).toBeUndefined();
    });

    it("should delete the logo when the client is deleted", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const client = await buildClientWithLogo();
      const key = client.logoKeyFromUrl(client.avatarUrl);

      await client.destroy({ force: true });

      expect(deleteFile).toHaveBeenCalledWith(key);
    });

    it("should not delete the logo of another client", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const other = await buildClientWithLogo();
      const client = await buildMetadataDocumentOAuthClient({
        avatarUrl: other.avatarUrl,
      });

      await client.destroy();

      expect(deleteFile).not.toHaveBeenCalled();
    });

    it("should delete a replaced logo", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const client = await buildClientWithLogo();
      const key = client.logoKeyFromUrl(client.avatarUrl);

      await client.update({ avatarUrl: buildLogoUrl(client.id) });

      expect(deleteFile).toHaveBeenCalledWith(key);
    });

    it("should not delete a logo when the transaction rolls back", async () => {
      const deleteFile = vi.spyOn(FileStorage, "deleteFile");
      const client = await buildClientWithLogo();

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
