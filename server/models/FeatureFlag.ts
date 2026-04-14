import crypto from "node:crypto";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Table,
  Column,
  DataType,
  AllowNull,
  Default,
  IsIn,
  Unique,
  AfterCreate,
  AfterUpdate,
  AfterDestroy,
} from "sequelize-typescript";
import { FeatureFlagDefaults } from "@shared/constants";
import {
  FeatureFlag as FeatureFlagEnum,
  type FeatureFlags,
} from "@shared/types";
import { Hour } from "@shared/utils/time";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "feature_flags", modelName: "feature_flag" })
@Fix
class FeatureFlag extends IdModel<
  InferAttributes<FeatureFlag>,
  Partial<InferCreationAttributes<FeatureFlag>>
> {
  /** The flag name from the FeatureFlag enum. */
  @IsIn([Object.values(FeatureFlagEnum)])
  @Unique
  @Column(DataType.STRING)
  name: FeatureFlagEnum;

  /** Team IDs that have this flag explicitly enabled. */
  @Default([])
  @Column(DataType.ARRAY(DataType.UUID))
  teamIds: string[];

  /** Percentage of teams to enable for (0-100). Applies to teams not in teamIds. */
  @AllowNull
  @Column({
    type: DataType.INTEGER,
    validate: {
      min: 0,
      max: 100,
    },
  })
  percentage: number | null;

  // Hooks

  @AfterCreate
  @AfterUpdate
  @AfterDestroy
  static async invalidateCache() {
    await CacheHelper.clearData(RedisPrefixHelper.getFeatureFlagsKey());
  }

  // Static methods

  /**
   * Resolve all feature flags for a team.
   *
   * @param teamId The team to resolve flags for.
   * @returns A complete map of all flags with resolved boolean values.
   */
  static async resolveAll(teamId: string): Promise<Required<FeatureFlags>> {
    const rows = await CacheHelper.getDataOrSet(
      RedisPrefixHelper.getFeatureFlagsKey(),
      async () => this.findAll(),
      12 * Hour.seconds
    );

    const rowsByName = new Map((rows ?? []).map((r) => [r.name, r]));
    const resolved = Object.assign(
      {} as Record<string, boolean>,
      FeatureFlagDefaults
    );

    for (const flag of Object.values(FeatureFlagEnum) as string[]) {
      const row = rowsByName.get(flag as unknown as FeatureFlagEnum);
      if (!row) {
        continue;
      }

      if (row.teamIds.includes(teamId)) {
        resolved[flag] = true;
        continue;
      }

      if (row.percentage !== null) {
        resolved[flag] = this.isInPercentage(teamId, flag, row.percentage);
        continue;
      }

      resolved[flag] = false;
    }

    return resolved as Required<FeatureFlags>;
  }

  /**
   * Check if a single flag is enabled for a team.
   *
   * @param flag The feature flag to check.
   * @param teamId The team to check for.
   * @returns Whether the flag is enabled.
   */
  static async isEnabled(
    flag: FeatureFlagEnum,
    teamId: string
  ): Promise<boolean> {
    const resolved = await this.resolveAll(teamId);
    return (resolved as Record<string, boolean>)[flag] ?? false;
  }

  /**
   * Deterministic percentage check. Uses MD5 hash of teamId + flag name
   * so the same team always gets the same result for a given percentage.
   * As percentage increases, previously-included teams stay included.
   *
   * @param teamId The team ID.
   * @param flag The flag name.
   * @param percentage The rollout percentage (0-100).
   * @returns Whether this team falls within the percentage.
   */
  static isInPercentage(
    teamId: string,
    flag: string,
    percentage: number
  ): boolean {
    const hash = crypto.createHash("md5").update(`${teamId}:${flag}`).digest();
    const value = hash.readUInt32BE(0) % 100;
    return value < percentage;
  }
}

export default FeatureFlag;
