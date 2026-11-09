import type { MockInstance } from "vitest";
import { vi } from "vitest";
import type { CustomTheme } from "@shared/types";
import { randomString } from "@shared/random";
import { CommentingAccess, Plan, TeamPreference } from "@shared/types";
import { Team } from "@server/models";
import { buildAdmin, buildTeam, buildUser } from "@server/test/factories";
import { setCloudHosted, withAPIContext } from "@server/test/support";
import teamUpdater from "./teamUpdater";

describe("teamUpdater", () => {
  describe("default share expiry", () => {
    let planSpy: MockInstance<() => Plan>;

    beforeEach(() => {
      planSpy = vi.spyOn(Team.prototype, "plan", "get");
    });

    afterEach(() => {
      planSpy.mockRestore();
    });

    const update = async (days: number) => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });
      return {
        team,
        user,
        run: () =>
          withAPIContext(user, (ctx) =>
            teamUpdater(ctx, {
              params: {
                preferences: { [TeamPreference.DefaultShareExpiryDays]: days },
              },
              user,
              team,
            })
          ),
      };
    };

    it("should allow setting with the advanced security entitlement", async () => {
      planSpy.mockReturnValue(Plan.Business);
      const { run } = await update(30);

      const updated = await run();
      await updated.reload();
      expect(
        updated.getPreference(TeamPreference.DefaultShareExpiryDays)
      ).toEqual(30);
    });

    it("should require the advanced security entitlement to set", async () => {
      planSpy.mockReturnValue(Plan.Community);
      const { run } = await update(30);

      await expect(run()).rejects.toThrow();
    });

    it("should allow removing without the entitlement", async () => {
      planSpy.mockReturnValue(Plan.Community);
      const { team, run } = await update(0);
      team.setPreference(TeamPreference.DefaultShareExpiryDays, 30);
      await team.save();

      const updated = await run();
      await updated.reload();
      expect(
        updated.getPreference(TeamPreference.DefaultShareExpiryDays)
      ).toEqual(0);
    });
  });

  describe("preferences", () => {
    it("should update preference when value changes", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const newValue = CommentingAccess.None;

      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: {
            preferences: {
              [TeamPreference.Commenting]: newValue,
            },
          },
          user,
          team,
        })
      );

      expect(updatedTeam.getPreference(TeamPreference.Commenting)).toEqual(
        newValue
      );
    });

    it("should not update preference when value is the same (isEqual check)", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      // Set a known preference value
      team.setPreference(TeamPreference.ViewersCanExport, true);
      await team.save();

      // Try to set the same value again
      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: {
            preferences: {
              [TeamPreference.ViewersCanExport]: true,
            },
          },
          user,
          team,
        })
      );

      // Verify the value is still correct
      expect(
        updatedTeam.getPreference(TeamPreference.ViewersCanExport)
      ).toEqual(true);
    });

    it("should handle complex preference values with deep equality", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      // Set initial theme
      team.setPreference(TeamPreference.CustomTheme, {
        accent: "#FF0000",
        accentText: "#00FF00",
      });
      await team.save();

      // Pass an object with the same values (but different reference)
      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: {
            preferences: {
              [TeamPreference.CustomTheme]: {
                accent: "#FF0000",
                accentText: "#00FF00",
              },
            },
          },
          user,
          team,
        })
      );

      // The theme should still be set correctly with isEqual comparison
      const theme = updatedTeam.getPreference(
        TeamPreference.CustomTheme
      ) as Partial<CustomTheme>;
      expect(theme?.accent).toEqual("#FF0000");
      expect(theme?.accentText).toEqual("#00FF00");
    });

    it("should update only preferences that have different values", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      // Set initial values
      team.setPreference(TeamPreference.Commenting, CommentingAccess.Members);
      team.setPreference(TeamPreference.ViewersCanExport, true);
      await team.save();

      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: {
            preferences: {
              // Same - should skip due to isEqual
              [TeamPreference.Commenting]: CommentingAccess.Members,
              [TeamPreference.ViewersCanExport]: false, // Different - should update
            },
          },
          user,
          team,
        })
      );

      expect(updatedTeam.getPreference(TeamPreference.Commenting)).toEqual(
        CommentingAccess.Members
      );
      expect(
        updatedTeam.getPreference(TeamPreference.ViewersCanExport)
      ).toEqual(false);
    });
  });

  describe("basic attributes", () => {
    it("should update team name", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: { name: "Updated Team Name" },
          user,
          team,
        })
      );

      expect(updatedTeam.name).toEqual("Updated Team Name");
    });
  });

  describe("subdomain", () => {
    beforeEach(setCloudHosted);

    it("should update subdomain when available", async () => {
      const subdomain = `available-${randomString({ length: 10, charset: "alphabetic", capitalization: "lowercase" })}`;
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: { subdomain },
          user,
          team,
        })
      );

      expect(updatedTeam.subdomain).toEqual(subdomain);
    });

    it("should throw a validation error when subdomain is taken", async () => {
      const subdomain = `taken-${randomString({ length: 10, charset: "alphabetic", capitalization: "lowercase" })}`;
      await buildTeam({ subdomain });
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      await expect(
        withAPIContext(user, (ctx) =>
          teamUpdater(ctx, {
            params: { subdomain },
            user,
            team,
          })
        )
      ).rejects.toThrow("Subdomain is already in use");
    });
  });
});
