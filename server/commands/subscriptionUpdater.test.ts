import { sequelize } from "@server/database/sequelize";
import { Subscription, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import subscriptionUpdater from "./subscriptionUpdater";

beforeEach(() => flushdb());

describe("subscriptionUpdater", () => {
  const ip = "127.0.0.1";
  const subscribedEvent = "documents.update";

  it("should toggle an existing subscription", async () => {
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
          enabled: true,
          transaction,
        })
    );

    const subscriptionUpdated = await sequelize.transaction(
      async (transaction) =>
        await subscriptionUpdater({
          user: user,
          subscription,
          event: subscribedEvent,
          enabled: false,
          ip,
          transaction,
        })
    );

    const event = await Event.findOne();
    expect(subscription.userId).toEqual(user.id);
    expect(subscription.documentId).toEqual(document.id);
    expect(subscriptionUpdated.userId).toEqual(user.id);
    expect(subscriptionUpdated.documentId).toEqual(document.id);

    // Both should be disabled after transaction.
    expect(subscription.enabled).toEqual(false);
    expect(subscriptionUpdated.enabled).toEqual(false);

    expect(event?.name).toEqual("subscriptions.update");
    expect(event?.modelId).toEqual(subscription.id);
  });
});
