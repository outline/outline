import { Matches } from "class-validator";
import { subMinutes } from "date-fns";
import randomstring from "randomstring";
import { InferAttributes, InferCreationAttributes, Op } from "sequelize";
import {
  Column,
  Table,
  Unique,
  BeforeValidate,
  BelongsTo,
  ForeignKey,
  IsDate,
  DataType,
  AfterFind,
  BeforeSave,
} from "sequelize-typescript";
import { ApiKeyValidation } from "@shared/validations";
import { hash } from "@server/utils/crypto";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import { SkipChangeset } from "./decorators/Changeset";
import Fix from "./decorators/Fix";
import AuthenticationHelper from "./helpers/AuthenticationHelper";
import Length from "./validators/Length";

@Table({ tableName: "apiKeys", modelName: "apiKey" })
@Fix
class ApiKey extends ParanoidModel<
  InferAttributes<ApiKey>,
  Partial<InferCreationAttributes<ApiKey>>
> {
  static prefix = "ol_api_";

  static eventNamespace = "api_keys";

  /** The human-readable name of this API key */
  @Length({
    min: ApiKeyValidation.minNameLength,
    max: ApiKeyValidation.maxNameLength,
    msg: `Name must be between ${ApiKeyValidation.minNameLength} and ${ApiKeyValidation.maxNameLength} characters`,
  })
  @Column
  name: string;

  /** A list of scopes that this API key has access to */
  @Matches(/[\/\.\w\s]*/, {
    each: true,
  })
  @Column(DataType.ARRAY(DataType.STRING))
  scope: string[] | null;

  /** @deprecated The plain text value of the API key, removed soon. */
  @Unique
  @Column
  secret: string;

  /** The cached plain text value. Only available when creating the API key */
  @Column(DataType.VIRTUAL)
  value: string | null;

  /** The hashed value of the API key */
  @Unique
  @Column
  @SkipChangeset
  hash: string;

  /** The last 4 characters of the API key */
  @Column
  @SkipChangeset
  last4: string;

  /** The date and time when this API key will expire */
  @IsDate
  @Column
  expiresAt: Date | null;

  /** The date and time when this API key was last used */
  @IsDate
  @Column
  @SkipChangeset
  lastActiveAt: Date | null;

  // hooks

  @AfterFind
  public static async afterFindHook(models: ApiKey | ApiKey[]) {
    const modelsArray = Array.isArray(models) ? models : [models];
    for (const model of modelsArray) {
      if (model?.secret) {
        model.last4 = model.secret.slice(-4);
      }
    }
  }

  @BeforeValidate
  public static async generateSecret(model: ApiKey) {
    if (!model.hash) {
      const secret = `${ApiKey.prefix}${randomstring.generate(38)}`;
      model.value = model.secret || secret;
      model.hash = hash(model.value);
    }
  }

  @BeforeSave
  public static async updateLast4(model: ApiKey) {
    const value = model.value || model.secret;
    if (value) {
      model.last4 = value.slice(-4);
    }
  }

  /**
   * Validates that the input text _could_ be an API key, this does not check
   * that the key actually exists in the database.
   *
   * @param text The text to validate
   * @returns True if likely an API key
   */
  public static match(text: string) {
    // cannot guarantee prefix here as older keys do not include it.
    return !!text.replace(ApiKey.prefix, "").match(/^[\w]{38}$/);
  }

  /**
   * Finds an API key by the given input string. This will check both the
   * secret and hash fields.
   *
   * @param input The input string to search for
   * @returns The API key if found
   */
  public static findByToken(input: string) {
    return this.findOne({
      where: {
        [Op.or]: [{ secret: input }, { hash: hash(input) }],
      },
    });
  }

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  // methods

  updateActiveAt = async () => {
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    // ensure this is updated only every few minutes otherwise
    // we'll be constantly writing to the DB as API requests happen
    if (!this.lastActiveAt || this.lastActiveAt < fiveMinutesAgo) {
      this.lastActiveAt = new Date();
    }

    return this.save({ silent: true });
  };

  /** Checks if the API key has access to the given path */
  canAccess = (path: string) => {
    if (!this.scope) {
      return true;
    }

    return AuthenticationHelper.canAccess(path, this.scope);
  };
}

export default ApiKey;
