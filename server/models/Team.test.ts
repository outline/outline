import { randomUUID } from "node:crypto";
import { Team } from "@server/models";
import {
  buildTeam,
  buildCollection,
  buildAttachment,
} from "@server/test/factories";

describe("Team", () => {
  describe("findByDomain", () => {
    it("should find a team by its domain", async () => {
      const domain = `${randomUUID()}.example.com`;
      const team = await buildTeam({ domain });
      const result = await Team.findByDomain(domain);
      expect(result?.id).toEqual(team.id);
    });

    it("should normalize domain to lowercase", async () => {
      const id = randomUUID();
      const team = await buildTeam({ domain: `${id}.example.com` });
      const result = await Team.findByDomain(`${id}.Example.COM`);
      expect(result?.id).toEqual(team.id);
    });

    it("should strip protocol from input", async () => {
      const domain = `${randomUUID()}.example.com`;
      const team = await buildTeam({ domain });
      const result = await Team.findByDomain(`https://${domain}`);
      expect(result?.id).toEqual(team.id);
    });

    it("should strip port from input", async () => {
      const domain = `${randomUUID()}.example.com`;
      const team = await buildTeam({ domain });
      const result = await Team.findByDomain(`${domain}:3000`);
      expect(result?.id).toEqual(team.id);
    });

    it("should strip path from input", async () => {
      const domain = `${randomUUID()}.example.com`;
      const team = await buildTeam({ domain });
      const result = await Team.findByDomain(`${domain}/some/path`);
      expect(result?.id).toEqual(team.id);
    });

    it("should return null for unregistered domain", async () => {
      const result = await Team.findByDomain("unknown.example.com");
      expect(result).toBeNull();
    });
  });

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
      const team = await buildTeam({
        subdomain: "example",
      });
      const subdomain = "updated";

      await team.update({ subdomain });
      expect(team.subdomain).toEqual(subdomain);
      expect(team.previousSubdomains?.length).toEqual(1);
      expect(team.previousSubdomains?.[0]).toEqual("example");

      const subdomain2 = "another";
      await team.update({ subdomain: subdomain2 });
      expect(team.subdomain).toEqual(subdomain2);
      expect(team.previousSubdomains?.length).toEqual(2);
      expect(team.previousSubdomains?.[0]).toEqual("example");
      expect(team.previousSubdomains?.[1]).toEqual(subdomain);
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
