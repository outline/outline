import { randomUUID } from "node:crypto";
import { OAuthClient } from "@server/models";
import {
  buildMetadataDocumentOAuthClient,
  buildOAuthClient,
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
  });
});
