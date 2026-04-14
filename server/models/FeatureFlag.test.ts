import { randomUUID } from "node:crypto";
import { FeatureFlagDefaults } from "@shared/constants";
import { FeatureFlag as FeatureFlagEnum } from "@shared/types";
import { FeatureFlag } from "@server/models";
import { buildTeam } from "@server/test/factories";

describe("FeatureFlag", () => {
  afterEach(async () => {
    await FeatureFlag.destroy({ where: {}, force: true });
  });

  describe("isInPercentage", () => {
    it("should return false when percentage is 0", () => {
      const teamId = randomUUID();
      expect(FeatureFlag.isInPercentage(teamId, "testFlag", 0)).toBe(false);
    });

    it("should return true when percentage is 100", () => {
      const teamId = randomUUID();
      expect(FeatureFlag.isInPercentage(teamId, "testFlag", 100)).toBe(true);
    });

    it("should be deterministic for the same inputs", () => {
      const teamId = randomUUID();
      const a = FeatureFlag.isInPercentage(teamId, "testFlag", 50);
      const b = FeatureFlag.isInPercentage(teamId, "testFlag", 50);
      expect(a).toBe(b);
    });

    it("should vary by teamId", () => {
      const results = new Set<boolean>();
      for (let i = 0; i < 50; i++) {
        results.add(FeatureFlag.isInPercentage(randomUUID(), "testFlag", 50));
      }
      expect(results.size).toBe(2);
    });

    it("should vary by flag name", () => {
      const teamId = randomUUID();
      const results = new Set<boolean>();
      for (let i = 0; i < 50; i++) {
        results.add(FeatureFlag.isInPercentage(teamId, `flag-${i}`, 50));
      }
      expect(results.size).toBe(2);
    });

    it("should be monotonic — increasing percentage never removes a team", () => {
      const teamId = randomUUID();
      let becameTrue = false;

      for (let pct = 0; pct <= 100; pct++) {
        const result = FeatureFlag.isInPercentage(teamId, "testFlag", pct);
        if (result) {
          becameTrue = true;
        }
        if (becameTrue) {
          expect(result).toBe(true);
        }
      }
    });

    it("should approximate the target percentage across many teams", () => {
      const total = 1000;
      let enabled = 0;

      for (let i = 0; i < total; i++) {
        if (FeatureFlag.isInPercentage(randomUUID(), "testFlag", 30)) {
          enabled++;
        }
      }

      const ratio = enabled / total;
      expect(ratio).toBeGreaterThan(0.2);
      expect(ratio).toBeLessThan(0.4);
    });
  });

  describe("resolveAll", () => {
    it("should return defaults when no rows exist", async () => {
      const team = await buildTeam();
      const result = await FeatureFlag.resolveAll(team.id);
      expect(result).toEqual(FeatureFlagDefaults);
    });

    it("should return true when team is in teamIds", async () => {
      const team = await buildTeam();
      await FeatureFlag.create({
        name: FeatureFlagEnum.GroupSync,
        teamIds: [team.id],
        percentage: null,
      });
      const result = await FeatureFlag.resolveAll(team.id);
      expect(result[FeatureFlagEnum.GroupSync]).toBe(true);
    });

    it("should return false when row exists but team not included", async () => {
      const team = await buildTeam();
      const otherTeam = await buildTeam();
      await FeatureFlag.create({
        name: FeatureFlagEnum.GroupSync,
        teamIds: [otherTeam.id],
        percentage: null,
      });
      const result = await FeatureFlag.resolveAll(team.id);
      expect(result[FeatureFlagEnum.GroupSync]).toBe(false);
    });

    it("should use percentage when team is not in teamIds", async () => {
      const team = await buildTeam();
      await FeatureFlag.create({
        name: FeatureFlagEnum.GroupSync,
        teamIds: [],
        percentage: 100,
      });
      const result = await FeatureFlag.resolveAll(team.id);
      expect(result[FeatureFlagEnum.GroupSync]).toBe(true);
    });

    it("should enable for team in teamIds regardless of percentage", async () => {
      const team = await buildTeam();
      await FeatureFlag.create({
        name: FeatureFlagEnum.GroupSync,
        teamIds: [team.id],
        percentage: 0,
      });
      const result = await FeatureFlag.resolveAll(team.id);
      expect(result[FeatureFlagEnum.GroupSync]).toBe(true);
    });
  });

  describe("isEnabled", () => {
    it("should return default when no row exists", async () => {
      const team = await buildTeam();
      const result = await FeatureFlag.isEnabled(
        FeatureFlagEnum.GroupSync,
        team.id
      );
      expect(result).toBe(false);
    });

    it("should return true when team is explicitly enabled", async () => {
      const team = await buildTeam();
      await FeatureFlag.create({
        name: FeatureFlagEnum.GroupSync,
        teamIds: [team.id],
        percentage: null,
      });
      const result = await FeatureFlag.isEnabled(
        FeatureFlagEnum.GroupSync,
        team.id
      );
      expect(result).toBe(true);
    });
  });
});
