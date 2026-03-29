import { randomUUID } from "node:crypto";
import {
  buildTeam,
  buildCollection,
  buildAttachment,
} from "@server/test/factories";

describe("Team", () => {
  describe("collectionIds", () => {
    it("should return non-private collection ids", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      // build a collection in another team
      await buildCollection();
      // build a private collection
      await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const response = await team.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });
  });

  describe("previousSubdomains", () => {
    it("should list the previous subdomains", async () => {
      const s1 = `example-${Math.random().toString(36).substring(7)}`;
      const s2 = `updated-${Math.random().toString(36).substring(7)}`;
      const s3 = `another-${Math.random().toString(36).substring(7)}`;

      const team = await buildTeam({
        subdomain: s1,
      });

      await team.update({ subdomain: s2 });
      expect(team.subdomain).toEqual(s2);
      expect(team.previousSubdomains?.length).toEqual(1);
      expect(team.previousSubdomains?.[0]).toEqual(s1);

      await team.update({ subdomain: s3 });
      expect(team.subdomain).toEqual(s3);
      expect(team.previousSubdomains?.length).toEqual(2);
      expect(team.previousSubdomains?.[0]).toEqual(s1);
      expect(team.previousSubdomains?.[1]).toEqual(s2);
    });
  });

  describe("publicAvatarUrl", () => {
    it("should return null when no avatarUrl is set", async () => {
      const team = await buildTeam({ avatarUrl: null });
      const result = await team.publicAvatarUrl();
      expect(result).toBeNull();
    });

    it("should return external URL unchanged", async () => {
      const url = "https://example.com/logo.png";
      const team = await buildTeam({ avatarUrl: url });
      const result = await team.publicAvatarUrl();
      expect(result).toEqual(url);
    });

    it("should return signed URL for private-bucket attachment redirect", async () => {
      const team = await buildTeam();
      const attachment = await buildAttachment({
        teamId: team.id,
        acl: "private",
      });

      await team.update({
        avatarUrl: `/api/attachments.redirect?id=${attachment.id}`,
      });

      const result = await team.publicAvatarUrl();
      expect(result).toEqual(await attachment.signedUrl);
    });

    it("should return canonical URL for public-bucket attachment redirect", async () => {
      const team = await buildTeam();
      const id = randomUUID();
      const attachment = await buildAttachment({
        id,
        teamId: team.id,
        key: `avatars/${team.id}/${id}/logo.png`,
        acl: "public-read",
      });

      await team.update({
        avatarUrl: `/api/attachments.redirect?id=${attachment.id}`,
      });

      const result = await team.publicAvatarUrl();
      expect(result).toEqual(attachment.canonicalUrl);
    });
  });
});
