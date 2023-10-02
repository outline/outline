import pick from "lodash/pick";
import randomstring from "randomstring";
import {
  Column,
  Table,
  Unique,
  BeforeValidate,
  BelongsTo,
  ForeignKey,
  AfterCreate,
  AfterDestroy,
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

  static eventProperties = ["name"];

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
  static async afterCreateEvent(model: ApiKey, context: APIContext["context"]) {
    await this.insertEvent("create", model, context);
  }

  @AfterDestroy
  static async afterDestroyEvent(
    model: ApiKey,
    context: APIContext["context"]
  ) {
    await this.insertEvent("delete", model, context);
  }

  @BeforeValidate
  static async generateSecret(model: ApiKey) {
    if (!model.secret) {
      model.secret = `${ApiKey.prefix}${randomstring.generate(38)}`;
    }
  }

  private static async insertEvent(
    name: string,
    model: ApiKey,
    context: APIContext["context"]
  ) {
    return Event.create(
      {
        name: `${this.eventNamespace}.${name}`,
        modelId: model.id,
        teamId: context.auth.user.teamId,
        actorId: context.auth.user.id,
        ip: context.ip,
        data: pick(model, this.eventProperties),
      },
      {
        transaction: context.transaction,
      }
    );
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
