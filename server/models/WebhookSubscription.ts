import crypto from "node:crypto";
import { isNil } from "es-toolkit/compat";
import type {
  InferAttributes,
  InferCreationAttributes,
  InstanceUpdateOptions,
  Transaction,
} from "sequelize";
import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  NotEmpty,
  DataType,
  BeforeCreate,
  AfterCreate,
  AfterUpdate,
  AfterDestroy,
  AfterRestore,
  DefaultScope,
  AllowNull,
} from "sequelize-typescript";
import { Hour } from "@shared/utils/time";
import { WebhookSubscriptionValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import type { Event } from "@server/types";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Encrypted from "./decorators/Encrypted";
import Fix from "./decorators/Fix";
import IsUrl from "./validators/IsUrl";
import Length from "./validators/Length";
import { randomString } from "@shared/random";

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

  /**
   * Returns the enabled webhook subscriptions for a team, caching the
   * lightweight { id, events } projection in Redis to avoid a database query on
   * every event. The cache is invalidated by model lifecycle hooks whenever a
   * team's subscriptions change.
   *
   * @param teamId The team to load subscriptions for.
   * @returns the enabled subscriptions' ids and subscribed event names.
   */
  public static async findEnabledByTeamId(
    teamId: string
  ): Promise<Array<{ id: string; events: string[] }>> {
    return (
      (await CacheHelper.getDataOrSet<Array<{ id: string; events: string[] }>>(
        RedisPrefixHelper.getWebhookSubscriptionsKey(teamId),
        async () => {
          const subscriptions = await this.unscoped().findAll({
            attributes: ["id", "events"],
            where: { enabled: true, teamId },
            raw: true,
          });
          return subscriptions.map((subscription) => ({
            id: subscription.id,
            events: subscription.events,
          }));
        },
        Hour.seconds
      )) ?? []
    );
  }

  /**
   * Determines whether a subscription configured for the given event names
   * should receive an event with the given name. Pure so it can run against the
   * cached projection as well as model instances.
   *
   * @param events The event names a subscription is configured for.
   * @param eventName The name of the event being processed.
   * @returns true if the event matches the subscription configuration.
   */
  public static matchEvent(events: string[], eventName: string): boolean {
    if (events.length === 1 && events[0] === "*") {
      return true;
    }

    for (const e of events) {
      if (e === eventName || eventName.startsWith(e + ".")) {
        return true;
      }
    }

    return false;
  }

  @NotEmpty
  @Length({
    max: WebhookSubscriptionValidation.maxNameLength,
    msg: `Webhook name must be ${WebhookSubscriptionValidation.maxNameLength} characters or less`,
  })
  @Column
  name: string;

  @IsUrl
  @NotEmpty
  @Length({
    max: WebhookSubscriptionValidation.maxUrlLength,
    msg: `Webhook url must be ${WebhookSubscriptionValidation.maxUrlLength} characters or less`,
  })
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

  @AfterCreate
  @AfterUpdate
  @AfterDestroy
  @AfterRestore
  static async invalidateCache(
    model: WebhookSubscription,
    options: { transaction?: Transaction | null }
  ) {
    const invalidate = () =>
      CacheHelper.removeData(
        RedisPrefixHelper.getWebhookSubscriptionsKey(model.teamId)
      );

    // Defer invalidation until after the transaction commits so that a rollback
    // does not leave the cache out of sync, and so a stale pre-commit read is
    // not re-cached by a concurrent reader. Walk to the parent transaction when
    // nested so the callback isn't lost when a savepoint releases.
    if (options.transaction) {
      const transaction = options.transaction.parent || options.transaction;
      transaction.afterCommit(invalidate);
    } else {
      await invalidate();
    }
  }

  // instance methods

  /**
   * Rotate the secret value. Does not persist to database.
   */
  public rotateSecret() {
    this.secret = `ol_whs_${randomString(32)}`;
  }

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
   * @param event Event to check
   * @returns true if event is valid
   */
  public validForEvent = (event: Event): boolean =>
    WebhookSubscription.matchEvent(this.events, event.name);

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
