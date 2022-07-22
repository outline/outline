import { sequelize } from "@server/database/sequelize";
import { Subscription, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import subscriptionDestroyer from "./subscriptionDestroyer";

beforeEach(() => flushdb());

describe("subscriptionDestroyer", () => {
  const ip = "127.0.0.1";
  const enabled = true;
  const subscribedEvent = "documents.update";

  it("should destroy existing subscription", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await sequelize.transaction(
      async (transaction) =>
        await Subscription.create({
          userId: user.id,
          documentId: document.id,
          event: subscribedEvent,
          enabled,
          transaction,
        })
    );

    await sequelize.transaction(
      async (transaction) =>
        await subscriptionDestroyer({
          user: user,
          subscription,
          ip,
          transaction,
        })
    );

    const count = await Subscription.count();
    expect(count).toEqual(0);

    const event = await Event.findOne();
    // NOTE: Up for change depending on
    // outline/server/commands/subscriptionDestroyer.ts
    // L36
    expect(event?.name).toEqual("subscriptions.update");
    expect(event?.modelId).toEqual(subscription.id);
    expect(event?.actorId).toEqual(subscription.userId);
    expect(event?.userId).toEqual(subscription.userId);
    expect(event?.documentId).toEqual(subscription.documentId);
  });
});
