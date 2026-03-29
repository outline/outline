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
import Fix from "./decorators/Fix";
import { UserPasskeyValidation } from "@shared/validations";
import NotContainsUrl from "./validators/NotContainsUrl";
import { SkipChangeset } from "./decorators/Changeset";

@Table({ tableName: "user_passkeys", modelName: "user_passkey" })
@Fix
class UserPasskey extends IdModel<
  InferAttributes<UserPasskey>,
  Partial<InferCreationAttributes<UserPasskey>>
> {
  static eventNamespace = "passkeys";

  @Column
  credentialId: string;

  @Column(DataType.BLOB)
  @SkipChangeset
  credentialPublicKey: Buffer;

  @Column
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
  @Column
  name: string;

  @Column
  userAgent: string | null;

  @IsDate
  @Column
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
