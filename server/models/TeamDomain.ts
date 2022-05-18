import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "team_domains", modelName: "team_domain" })
@Fix
class TeamDomain extends BaseModel {
  @NotEmpty
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
