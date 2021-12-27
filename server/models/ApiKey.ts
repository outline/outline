import randomstring from "randomstring";
import {
  Column,
  Table,
  Unique,
  DeletedAt,
  CreatedAt,
  UpdatedAt,
  BeforeValidate,
  BelongsTo,
} from "sequelize-typescript";
import BaseModel from "./BaseModel";
import User from "./User";

@Table({ tableName: "apiKeys", modelName: "apiKey" })
class ApiKey extends BaseModel {
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
