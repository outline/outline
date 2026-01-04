import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Length,
  Table,
} from "sequelize-typescript";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import { PasskeyValidation } from "@shared/validations";
import NotContainsUrl from "./validators/NotContainsUrl";

@Table({ tableName: "user_passkeys", modelName: "user_passkey" })
@Fix
class UserPasskey extends IdModel<
  InferAttributes<UserPasskey>,
  Partial<InferCreationAttributes<UserPasskey>>
> {
  static eventNamespace = "passkeys";

  @Column(DataType.TEXT)
  credentialId: string;

  @Column(DataType.BLOB)
  credentialPublicKey: Buffer;

  @Column(DataType.BIGINT)
  counter: number;

  @Column(DataType.ARRAY(DataType.STRING))
  transports: string[];

  @Length({
    min: PasskeyValidation.minNameLength,
    max: PasskeyValidation.maxNameLength,
    msg: `Name must be between ${PasskeyValidation.minNameLength} and ${PasskeyValidation.maxNameLength} characters`,
  })
  @NotContainsUrl
  @Column(DataType.TEXT)
  name: string;

  @Column(DataType.TEXT)
  userAgent: string | null;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;
}

export default UserPasskey;
