import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
  Model,
  IsUUID,
  PrimaryKey,
} from "sequelize-typescript";
import { ValidationError } from "../errors";
import Team from "./Team";
import UserAuthentication from "./UserAuthentication";
import Fix from "./decorators/Fix";

@Table({
  tableName: "authentication_providers",
  modelName: "authentication_provider",
  updatedAt: false,
})
@Fix
class AuthenticationProvider extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column
  name: string;

  @Default(true)
  @Column
  enabled: boolean;

  @Column
  providerId: string;

  @CreatedAt
  createdAt: Date;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @HasMany(() => UserAuthentication, "providerId")
  userAuthentications: UserAuthentication[];

  // instance methods

  disable = async () => {
    const res = await (this
      .constructor as typeof AuthenticationProvider).findAndCountAll({
      where: {
        teamId: this.teamId,
        enabled: true,
        id: {
          [Op.ne]: this.id,
        },
      },
      limit: 1,
    });

    if (res.count >= 1) {
      return this.update({
        enabled: false,
      });
    } else {
      throw ValidationError("At least one authentication provider is required");
    }
  };

  enable = () => {
    return this.update({
      enabled: true,
    });
  };
}

export default AuthenticationProvider;
