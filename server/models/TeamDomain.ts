import emailProviders from "email-providers";
import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
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
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import IsFQDN from "./validators/IsFQDN";
import Length from "./validators/Length";

@Table({ tableName: "team_domains", modelName: "team_domain" })
@Fix
class TeamDomain extends IdModel<
  InferAttributes<TeamDomain>,
  Partial<InferCreationAttributes<TeamDomain>>
> {
  @NotIn({
    args: env.isCloudHosted ? [emailProviders] : [],
    msg: "You chose a restricted domain, please try another.",
  })
  @NotEmpty
  @Length({ max: 255, msg: "name must be 255 characters or less" })
  @IsFQDN
  @Column
  name: string;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;

  // hooks

  @BeforeValidate
  static async cleanupDomain(model: TeamDomain) {
    model.name = model.name.toLowerCase().trim();
  }

  @BeforeCreate
  static async checkLimit(model: TeamDomain) {
    if (!env.isCloudHosted) {
      return;
    }

    const count = await this.count({
      where: { teamId: model.teamId },
    });
    if (count >= TeamValidation.maxDomains) {
      throw ValidationError(
        `You have reached the limit of ${TeamValidation.maxDomains} domains`
      );
    }
  }
}

export default TeamDomain;
