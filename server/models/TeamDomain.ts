import emailProviders from "email-providers";
import type {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  Column,
  DataType,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  NotIn,
  BeforeValidate,
  BeforeCreate,
} from "sequelize-typescript";
import { TeamValidation } from "@shared/validations";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import { LockHelper } from "@server/storage/LockHelper";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import IsFQDN from "./validators/IsFQDN";
import Length from "./validators/Length";

@Table({ tableName: "team_domains", modelName: "team_domain" })
class TeamDomain extends IdModel<
  InferAttributes<TeamDomain>,
  Partial<InferCreationAttributes<TeamDomain>>
> {
  @NotIn({
    args: env.isCloudHosted ? [emailProviders] : [],
    msg: "You chose a restricted domain, please try another.",
  })
  @NotEmpty
  @Length({
    max: TeamValidation.maxDomainLength,
    msg: `name must be ${TeamValidation.maxDomainLength} characters or less`,
  })
  @IsFQDN
  @Column(DataType.STRING)
  name: string;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  // hooks

  @BeforeValidate
  static async cleanupDomain(model: TeamDomain) {
    model.name = model.name.toLowerCase().trim();
  }

  @BeforeCreate
  static async checkLimit(model: TeamDomain, options: SaveOptions) {
    if (!env.isCloudHosted) {
      return;
    }

    const { transaction } = options;

    // Serialize concurrent creation for the team, otherwise every request can
    // read the same count and pass the check.
    await LockHelper.acquire(
      model.sequelize,
      `teamDomains:${model.teamId}`,
      transaction
    );

    const count = await this.count({
      where: { teamId: model.teamId },
      transaction,
    });
    if (count >= TeamValidation.maxDomains) {
      throw ValidationError(
        `You have reached the limit of ${TeamValidation.maxDomains} domains`
      );
    }
  }
}

export default TeamDomain;
