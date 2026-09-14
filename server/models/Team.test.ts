import { randomUUID } from "node:crypto";
import type { MockInstance } from "vitest";
import { vi } from "vitest";
import {
  RetentionPeriodPresets,
  TeamPreferenceDefaults,
} from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { Team } from "@server/models";
import {
  buildTeam,
  buildCollection,
  buildAttachment,
} from "@server/test/factories";
import { setCloudHosted, setSelfHosted } from "@server/test/support";

describe("Team", () => {
  describe("findByDomain", () => {
    it("should find a team by its domain", async () => {
      const domain = `${randomUUID()}.example.com`;
      const team = await buildTeam({ domain });
      const result = await Team.findByDomain(domain);
      expect(result?.id).toEqual(team.id);
    });

    it("should normalize domain to lowercase", async () => {
      const id = randomUUID().split("-")[0];
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
      const id = randomUUID();
      const originalSubdomain = `example-${id}`;
      const subdomain = `updated-${id}`;
      const subdomain2 = `another-${id}`;
      const team = await buildTeam({
        subdomain: originalSubdomain,
      });

      await team.update({ subdomain });
      expect(team.subdomain).toEqual(subdomain);
      expect(team.previousSubdomains?.length).toEqual(1);
      expect(team.previousSubdomains?.[0]).toEqual(originalSubdomain);

      await team.update({ subdomain: subdomain2 });
      expect(team.subdomain).toEqual(subdomain2);
      expect(team.previousSubdomains?.length).toEqual(2);
      expect(team.previousSubdomains?.[0]).toEqual(originalSubdomain);
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
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-16T00:00:00.000Z"));
      try {
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
      } finally {
        vi.useRealTimers();
      }
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

  describe("retentionPeriods", () => {
    it("should include every configurable period", () => {
      for (const days of RetentionPeriodPresets.filter(
        (preset) => preset > 0
      )) {
        expect(Team.retentionPeriods).toContain(days);
      }
    });

    it("should exclude infinite retention", () => {
      expect(Team.retentionPeriods).not.toContain(0);
    });

    it("should return periods in ascending order", () => {
      const periods = Team.retentionPeriods;
      expect([...periods].sort((a, b) => a - b)).toEqual([...periods]);
    });
  });

  describe("getDefaultRetentionPeriod", () => {
    it("should return the configured default", () => {
      expect(
        Team.getDefaultRetentionPeriod(TeamPreference.TrashRetentionDays)
      ).toEqual(TeamPreferenceDefaults[TeamPreference.TrashRetentionDays]);
    });
  });

  describe("getRetentionPeriodsInUse", () => {
    let findOne: MockInstance;

    afterEach(() => {
      findOne?.mockRestore();
    });

    it("should return every period when cloud hosted", async () => {
      setCloudHosted();
      findOne = vi.spyOn(Team, "findOne");

      expect(
        await Team.getRetentionPeriodsInUse(TeamPreference.TrashRetentionDays)
      ).toEqual(Team.retentionPeriods);
      expect(findOne).not.toHaveBeenCalled();
    });

    it("should return only the period the team is configured with", async () => {
      setSelfHosted();
      const team = await buildTeam();
      team.setPreference(TeamPreference.TrashRetentionDays, 365);
      findOne = vi.spyOn(Team, "findOne").mockResolvedValue(team);

      expect(
        await Team.getRetentionPeriodsInUse(TeamPreference.TrashRetentionDays)
      ).toEqual([365]);
    });

    it("should return the default period when the team has no preference", async () => {
      setSelfHosted();
      const team = await buildTeam();
      findOne = vi.spyOn(Team, "findOne").mockResolvedValue(team);

      expect(
        await Team.getRetentionPeriodsInUse(TeamPreference.TrashRetentionDays)
      ).toEqual([TeamPreferenceDefaults[TeamPreference.TrashRetentionDays]]);
    });

    it("should return no periods for infinite retention", async () => {
      setSelfHosted();
      const team = await buildTeam();
      team.setPreference(TeamPreference.TrashRetentionDays, 0);
      findOne = vi.spyOn(Team, "findOne").mockResolvedValue(team);

      expect(
        await Team.getRetentionPeriodsInUse(TeamPreference.TrashRetentionDays)
      ).toEqual([]);
    });

    it("should return no periods when there is no team", async () => {
      setSelfHosted();
      findOne = vi.spyOn(Team, "findOne").mockResolvedValue(null);

      expect(
        await Team.getRetentionPeriodsInUse(TeamPreference.TrashRetentionDays)
      ).toEqual([]);
    });
  });
});
