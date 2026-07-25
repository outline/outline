import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  IsDate,
  Length,
  Table,
} from "sequelize-typescript";
import User from "./User";
import IdModel from "./base/IdModel";
import { UserPasskeyValidation } from "@shared/validations";
import NotContainsUrl from "./validators/NotContainsUrl";
import { SkipChangeset } from "./decorators/Changeset";

@Table({ tableName: "user_passkeys", modelName: "user_passkey" })
class UserPasskey extends IdModel<
  InferAttributes<UserPasskey>,
  Partial<InferCreationAttributes<UserPasskey>>
> {
  static eventNamespace = "passkeys";

  @Column(DataType.STRING)
  credentialId: string;

  @Column(DataType.BLOB)
  @SkipChangeset
  credentialPublicKey: Buffer;

  @Column(DataType.STRING)
  aaguid: string | null;

  @Column(DataType.BIGINT)
  @SkipChangeset
  counter: number;

  @Column(DataType.ARRAY(DataType.STRING))
  transports: string[];

  @Length({
    min: UserPasskeyValidation.minNameLength,
    max: UserPasskeyValidation.maxNameLength,
    msg: `Name must be between ${UserPasskeyValidation.minNameLength} and ${UserPasskeyValidation.maxNameLength} characters`,
  })
  @NotContainsUrl
  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  userAgent: string | null;

  @IsDate
  @Column(DataType.DATE)
  @SkipChangeset
  lastActiveAt: Date | null;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;
}

export default UserPasskey;
