import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsIn,
  Table,
  Model,
  IsUUID,
  PrimaryKey,
} from "sequelize-typescript";
import { ValidationError } from "../errors";
import providers from "../routes/auth/providers";
import Team from "./Team";
import UserAuthentication from "./UserAuthentication";

@Table({
  tableName: "authentication_providers",
  modelName: "authentication_provider",
  updatedAt: false,
})
class AuthenticationProvider extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;

  @IsIn([providers.map((p) => p.id)])
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

  disable = async function () {
    const res = await AuthenticationProvider.findAndCountAll({
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

  enable = function () {
    return this.update({
      enabled: true,
    });
  };
}

export default AuthenticationProvider;
