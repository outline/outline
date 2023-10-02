import randomstring from "randomstring";
import {
  Column,
  Table,
  Unique,
  BeforeValidate,
  BelongsTo,
  ForeignKey,
  AfterCreate,
} from "sequelize-typescript";
import type { APIContext } from "@server/types";
import Event from "./Event";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "apiKeys", modelName: "apiKey" })
@Fix
class ApiKey extends ParanoidModel {
  static prefix = "ol_api_";

  static eventNamespace = "api_keys";

  @Length({
    min: 3,
    max: 255,
    msg: "Name must be between 3 and 255 characters",
  })
  @Column
  name: string;

  @Unique
  @Column
  secret: string;

  // hooks

  @AfterCreate
  static async afterCreateEvent(model: ApiKey, options: APIContext["context"]) {
    await Event.create(
      {
        name: `${this.eventNamespace}.create`,
        modelId: model.id,
        teamId: options.auth.user.teamId,
        actorId: options.auth.user.id,
        ip: options.ip,
        data: {
          name: model.name,
        },
      },
      {
        transaction: options.transaction,
      }
    );
  }

  @BeforeValidate
  static async generateSecret(model: ApiKey) {
    if (!model.secret) {
      model.secret = `${ApiKey.prefix}${randomstring.generate(38)}`;
    }
  }

  /**
   * Validates that the input touch could be an API key, this does not check
   * that the key exists in the database.
   *
   * @param text The text to validate
   * @returns True if likely an API key
   */
  static match(text: string) {
    return !!text.replace(ApiKey.prefix, "").match(/^[\w]{38}$/);
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;
}

export default ApiKey;
