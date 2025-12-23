import { TeamPreference } from "@shared/types";
import { Team } from "@server/models";
import { buildTeam, buildCollection } from "@server/test/factories";

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

  describe("findUniquePreferenceValues", () => {
    it("should return unique custom preference values", async () => {
      const val1 = Math.floor(Math.random() * 10000) + 1000;
      const val2 = Math.floor(Math.random() * 10000) + 11000;

      const team1 = await buildTeam();
      team1.setPreference(TeamPreference.TrashRetentionDays, val1);
      await team1.save();

      const team2 = await buildTeam();
      team2.setPreference(TeamPreference.TrashRetentionDays, val2);
      await team2.save();

      const team3 = await buildTeam();
      team3.setPreference(TeamPreference.TrashRetentionDays, val1);
      await team3.save();

      const results = await Team.findUniquePreferenceValues(
        TeamPreference.TrashRetentionDays,
        { useCache: false }
      );
      expect(results).toContain(val1);
      expect(results).toContain(val2);
    });

    it("should not return default preference values", async () => {
      const results = await Team.findUniquePreferenceValues(
        TeamPreference.TrashRetentionDays,
        { useCache: false }
      );
      const countBefore = results.length;

      await buildTeam();

      const resultsAfter = await Team.findUniquePreferenceValues(
        TeamPreference.TrashRetentionDays,
        { useCache: false }
      );
      expect(resultsAfter.length).toEqual(countBefore);
    });
  });
});
