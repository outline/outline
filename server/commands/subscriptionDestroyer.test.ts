import { Subscription, Event } from "@server/models";
import { sequelize } from "@server/storage/database";
import {
  buildDocument,
  buildSubscription,
  buildUser,
} from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import subscriptionDestroyer from "./subscriptionDestroyer";

setupTestDatabase();

describe("subscriptionDestroyer", () => {
  const ip = "127.0.0.1";

  it("should destroy existing subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
    });

    await sequelize.transaction(
      async (transaction) =>
        await subscriptionDestroyer({
          user,
          subscription,
          ip,
          transaction,
        })
    );

    const count = await Subscription.count();

    expect(count).toEqual(0);

    const event = await Event.findOne();

    expect(event?.name).toEqual("subscriptions.delete");
    expect(event?.modelId).toEqual(subscription.id);
    expect(event?.actorId).toEqual(subscription.userId);
    expect(event?.userId).toEqual(subscription.userId);
    expect(event?.documentId).toEqual(subscription.documentId);
  });

  it("should soft delete row", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
    });

    await sequelize.transaction(
      async (transaction) =>
        await subscriptionDestroyer({
          user,
          subscription,
          ip,
          transaction,
        })
    );

    const count = await Subscription.count();

    expect(count).toEqual(0);

    const event = await Event.findOne();

    expect(event?.name).toEqual("subscriptions.delete");
    expect(event?.modelId).toEqual(subscription.id);
    expect(event?.actorId).toEqual(subscription.userId);
    expect(event?.userId).toEqual(subscription.userId);
    expect(event?.documentId).toEqual(subscription.documentId);

    const deletedSubscription = await Subscription.findOne({
      where: {
        userId: user.id,
        documentId: document.id,
      },
      paranoid: false,
    });

    expect(deletedSubscription).toBeDefined();
    expect(deletedSubscription?.deletedAt).toBeDefined();
  });
});
