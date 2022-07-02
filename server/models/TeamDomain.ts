import emailProviders from "email-providers";
import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  NotIn,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "team_domains", modelName: "team_domain" })
@Fix
class TeamDomain extends IdModel {
  @NotIn({
    args: [emailProviders],
    msg: "You chose a restricted domain, please try another.",
  })
  @NotEmpty
  @Length({ min: 0, max: 255, msg: "Must be less than 255 characters" })
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
}

export default TeamDomain;
