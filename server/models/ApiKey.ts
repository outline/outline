import randomstring from "randomstring";
import {
  Column,
  Table,
  Unique,
  BeforeValidate,
  BelongsTo,
} from "sequelize-typescript";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";

@Table({ tableName: "apiKeys", modelName: "apiKey" })
class ApiKey extends ParanoidModel {
  @Column
  name: string;

  @Unique
  @Column
  secret: string;

  // hooks

  @BeforeValidate
  static async generateSecret(model: ApiKey) {
    if (!model.secret) {
      model.secret = randomstring.generate(38);
    }
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;
}

export default ApiKey;
