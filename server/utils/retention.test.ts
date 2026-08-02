import { sequelize } from "@server/storage/database";
import { buildTeam } from "@server/test/factories";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import {
  getDefaultRetentionPeriod,
  getRetentionPeriodsInUse,
} from "./retention";

const defaultRetentionDays = TeamPreferenceDefaults[
  TeamPreference.TrashRetentionDays
] as number;

describe("getDefaultRetentionPeriod", () => {
  it("should return the configured default", () => {
    expect(
      getDefaultRetentionPeriod(TeamPreference.TrashRetentionDays)
    ).toEqual(defaultRetentionDays);
  });
});

describe("getRetentionPeriodsInUse", () => {
  it("should always include the default period", async () => {
    const periods = await getRetentionPeriodsInUse(
      TeamPreference.TrashRetentionDays
    );
    expect(periods).toContain(defaultRetentionDays);
  });

  it("should include a period configured by a team", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 365);
    await team.save();

    const periods = await getRetentionPeriodsInUse(
      TeamPreference.TrashRetentionDays
    );
    expect(periods).toContain(365);
  });

  it("should exclude infinite retention", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 0);
    await team.save();

    const periods = await getRetentionPeriodsInUse(
      TeamPreference.TrashRetentionDays
    );
    expect(periods).not.toContain(0);
  });

  it("should ignore values that are not a whole number of days", async () => {
    const team = await buildTeam();
    await sequelize.query(
      `UPDATE teams SET preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), :path, '"nonsense"') WHERE id = :id`,
      {
        replacements: {
          path: `{${TeamPreference.TrashRetentionDays}}`,
          id: team.id,
        },
      }
    );

    const periods = await getRetentionPeriodsInUse(
      TeamPreference.TrashRetentionDays
    );
    expect(periods.every((days) => Number.isInteger(days) && days > 0)).toBe(
      true
    );
  });

  it("should return periods in ascending order", async () => {
    const periods = await getRetentionPeriodsInUse(
      TeamPreference.TrashRetentionDays
    );
    expect([...periods].sort((a, b) => a - b)).toEqual(periods);
  });
});
