import crypto from "crypto";
import isNil from "lodash/isNil";
import {
  InferAttributes,
  InferCreationAttributes,
  InstanceUpdateOptions,
} from "sequelize";
import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
  IsUrl,
  BeforeCreate,
  DefaultScope,
  AllowNull,
} from "sequelize-typescript";
import { WebhookSubscriptionValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import { Event } from "@server/types";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Encrypted from "./decorators/Encrypted";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@DefaultScope(() => ({
  include: [
    {
      association: "team",
      required: true,
    },
  ],
}))
@Table({
  tableName: "webhook_subscriptions",
  modelName: "webhook_subscription",
})
@Fix
class WebhookSubscription extends ParanoidModel<
  InferAttributes<WebhookSubscription>,
  Partial<InferCreationAttributes<WebhookSubscription>>
> {
  static eventNamespace = "webhookSubscriptions";

  @NotEmpty
  @Length({ max: 255, msg: "Webhook name be less than 255 characters" })
  @Column
  name: string;

  @IsUrl
  @NotEmpty
  @Length({ max: 255, msg: "Webhook url be less than 255 characters" })
  @Column
  url: string;

  @Column
  enabled: boolean;

  @Column(DataType.ARRAY(DataType.STRING))
  events: string[];

  @AllowNull
  @Column(DataType.BLOB)
  @Encrypted
  secret: string | null;

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  // hooks

  @BeforeCreate
  static async checkLimit(model: WebhookSubscription) {
    const count = await this.count({
      where: { teamId: model.teamId },
    });
    if (count >= WebhookSubscriptionValidation.maxSubscriptions) {
      throw ValidationError(
        `You have reached the limit of ${WebhookSubscriptionValidation.maxSubscriptions} webhooks`
      );
    }
  }

  // methods

  /**
   * Disables the webhook subscription
   *
   * @param options Save options
   * @returns Promise<WebhookSubscription>
   */
  public async disable(
    options?: InstanceUpdateOptions<InferAttributes<WebhookSubscription>>
  ) {
    return this.update({ enabled: false }, options);
  }

  /**
   * Determines if an event should be processed for this webhook subscription
   * based on the event configuration.
   *
   * @param event Event to ceck
   * @returns true if event is valid
   */
  public validForEvent = (event: Event): boolean => {
    if (this.events.length === 1 && this.events[0] === "*") {
      return true;
    }

    for (const e of this.events) {
      if (e === event.name || event.name.startsWith(e + ".")) {
        return true;
      }
    }

    return false;
  };

  /**
   * Calculates the signature for a webhook payload if the webhook subscription
   * has an associated secret stored.
   *
   * @param payload The text payload of a webhook delivery
   * @returns the signature as a string
   */
  public signature = (payload: string) => {
    if (isNil(this.secret)) {
      return;
    }

    const signTimestamp = Date.now();

    const signature = crypto
      .createHmac("sha256", this.secret)
      .update(`${signTimestamp}.${payload}`)
      .digest("hex");

    return `t=${signTimestamp},s=${signature}`;
  };
}

export default WebhookSubscription;
