import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
  IsIn,
} from "sequelize-typescript";
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
  @IsIn([["pending", "success", "failed"]])
  @Column(DataType.STRING)
  status: "pending" | "success" | "failed";

  @Column(DataType.INTEGER)
  statusCode: number;

  @Column(DataType.JSONB)
  requestBody: unknown;

  @Column(DataType.JSONB)
  requestHeaders: Record<string, string>;

  @Column(DataType.TEXT)
  responseBody: string;

  @Column(DataType.JSONB)
  responseHeaders: Record<string, string>;

  @Column(DataType.DATE)
  createdAt: Date;

  // associations

  @BelongsTo(() => WebhookSubscription, "webhookSubscriptionId")
  webhookSubscription: WebhookSubscription;

  @ForeignKey(() => WebhookSubscription)
  @Column
  webhookSubscriptionId: string;
}

export default WebhookDelivery;
