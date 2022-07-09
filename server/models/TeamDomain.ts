import emailProviders from "email-providers";
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
import { MAX_TEAM_DOMAINS } from "@shared/constants";
import { ValidationError } from "@server/errors";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import IsFQDN from "./validators/IsFQDN";
import Length from "./validators/Length";

@Table({ tableName: "team_domains", modelName: "team_domain" })
@Fix
class TeamDomain extends IdModel {
  @NotIn({
    args: [emailProviders],
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
    const count = await this.count({
      where: { teamId: model.teamId },
    });
    if (count >= MAX_TEAM_DOMAINS) {
      throw ValidationError(
        `You have reached the limit of ${MAX_TEAM_DOMAINS} domains`
      );
    }
  }
}

export default TeamDomain;
