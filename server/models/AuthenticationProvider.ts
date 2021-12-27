import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  Default,
  ForeignKey,
  HasMany,
  IsIn,
  Table,
} from "sequelize-typescript";
import { ValidationError } from "../errors";
import providers from "../routes/auth/providers";
import Team from "./Team";
import UserAuthentication from "./UserAuthentication";
import BaseModel from "./base/BaseModel";

@Table({
  tableName: "authentication_providers",
  modelName: "authentication_provider",
})
class AuthenticationProvider extends BaseModel {
  @Column
  @IsIn([providers.map((p) => p.id)])
  name: string;

  @Column
  @Default(true)
  enabled: boolean;

  @Column
  providerId: string;

  @CreatedAt
  createdAt: Date;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
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
