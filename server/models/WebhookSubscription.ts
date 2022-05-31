import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
} from "sequelize-typescript";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Encrypted, {
  getEncryptedColumn,
  setEncryptedColumn,
} from "./decorators/Encrypted";
import Fix from "./decorators/Fix";

@Table({
  tableName: "webhook_subscriptions",
  modelName: "webhook_subscription",
})
@Fix
class WebhookSubscription extends BaseModel {
  @NotEmpty
  @Column
  name: string;

  @NotEmpty
  @Column
  url: string;

  @Column
  enabled: boolean;

  @Column(DataType.ARRAY(DataType.STRING))
  events: string[];

  @Column(DataType.BLOB)
  @Encrypted
  get secret() {
    return getEncryptedColumn(this, "secret");
  }

  set secret(value: string) {
    setEncryptedColumn(this, "secret", value);
  }

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;
}

export default WebhookSubscription;
