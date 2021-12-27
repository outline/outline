import randomstring from "randomstring";
import {
  Model,
  Column,
  PrimaryKey,
  Table,
  IsUUID,
  Unique,
  DeletedAt,
  CreatedAt,
  UpdatedAt,
  BeforeValidate,
  BelongsTo,
} from "sequelize-typescript";
import User from "./User";

@Table({ tableName: "apiKeys", modelName: "apiKey" })
class ApiKey extends Model {
  @IsUUID(4)
  @Column
  @PrimaryKey
  id: string;

  @Column
  name: string;

  @Column
  @Unique
  secret: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt: Date;

  // hooks

  @BeforeValidate
  static async generateSecret(instance: ApiKey) {
    if (!instance.secret) {
      instance.secret = randomstring.generate(38);
    }
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;
}

export default ApiKey;
