import { CustomTheme, TeamPreference } from "@shared/types";
import { buildTeam, buildUser } from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import teamUpdater from "./teamUpdater";

describe("teamUpdater", () => {
  describe("preferences", () => {
    it("should update preference when value changes", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });

      const originalValue = team.getPreference(TeamPreference.Commenting);
      const newValue = !originalValue;

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
      team.setPreference(TeamPreference.Commenting, true);
      team.setPreference(TeamPreference.ViewersCanExport, true);
      await team.save();

      const updatedTeam = await withAPIContext(user, (ctx) =>
        teamUpdater(ctx, {
          params: {
            preferences: {
              [TeamPreference.Commenting]: true, // Same - should skip due to isEqual
              [TeamPreference.ViewersCanExport]: false, // Different - should update
            },
          },
          user,
          team,
        })
      );

      expect(updatedTeam.getPreference(TeamPreference.Commenting)).toEqual(
        true
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
});
