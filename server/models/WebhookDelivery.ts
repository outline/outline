import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
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
  statusCode: number;

  @NotEmpty
  @Column(DataType.JSONB)
  requestBody: any;

  @NotEmpty
  @Column(DataType.JSONB)
  requestHeaders: any;

  @Column(DataType.BLOB)
  responseBody: any;

  @NotEmpty
  @Column(DataType.JSONB)
  responseHeaders: any;

  // associations

  @BelongsTo(() => WebhookSubscription, "webhookSubscriptionId")
  createdBy: User;

  @ForeignKey(() => WebhookSubscription)
  @Column
  webhookSubscriptionId: string;
}

export default WebhookDelivery;
