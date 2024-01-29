import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
  IsIn,
} from "sequelize-typescript";
import { type WebhookDeliveryStatus } from "@server/types";
import WebhookSubscription from "./WebhookSubscription";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({
  tableName: "webhook_deliveries",
  modelName: "webhook_delivery",
})
@Fix
class WebhookDelivery extends IdModel<
  InferAttributes<WebhookDelivery>,
  Partial<InferCreationAttributes<WebhookDelivery>>
> {
  @NotEmpty
  @IsIn([["pending", "success", "failed"]])
  @Column(DataType.STRING)
  status: WebhookDeliveryStatus;

  @Column(DataType.INTEGER)
  statusCode?: number | null;

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
