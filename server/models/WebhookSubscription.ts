import crypto from "crypto";
import { bool } from "aws-sdk/clients/signer";
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
} from "sequelize-typescript";
import { SaveOptions } from "sequelize/types";
import { WebhookSubscriptionValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import { Event } from "@server/types";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Encrypted, {
  setEncryptedColumn,
  getEncryptedColumn,
} from "./decorators/Encrypted";
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
class WebhookSubscription extends ParanoidModel {
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
   * @returns Promise<void>
   */
  public async disable(options?: SaveOptions<WebhookSubscription>) {
    return this.update({ enabled: false }, options);
  }

  public validForEvent = (event: Event): bool => {
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

  public signature = (data: string) => {
    if (!this.secret) {
      return;
    }

    const signTimestamp = Date.now();

    const signature = crypto
      .createHmac("sha256", this.secret)
      .update(`${signTimestamp}.${data}`)
      .digest("hex");

    return `t=${signTimestamp},s=${signature}`;
  };
}

export default WebhookSubscription;
