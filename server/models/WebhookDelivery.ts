import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
  IsIn,
} from "sequelize-typescript";
import User from "./User";
import WebhookSubscription from "./WebhookSubscription";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({
  tableName: "webhook_deliveries",
  modelName: "webhook_delivery",
})
@Fix
class WebhookDelivery extends IdModel {
  @NotEmpty
  @Column
  @IsIn([["pending", "success", "failure"]])
  status: number;

  @Column
  statusCode: number;

  @Column(DataType.JSONB)
  requestBody: unknown;

  @Column(DataType.JSONB)
  requestHeaders: Record<string, string>;

  @Column(DataType.BLOB)
  responseBody: unknown;

  @Column(DataType.JSONB)
  responseHeaders: Record<string, string>;

  // associations

  @BelongsTo(() => WebhookSubscription, "webhookSubscriptionId")
  createdBy: User;

  @ForeignKey(() => WebhookSubscription)
  @Column
  webhookSubscriptionId: string;
}

export default WebhookDelivery;
